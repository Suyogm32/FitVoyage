import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { ExerciseDB } from "../models/ExerciseDB.js";
import { Workouts } from "../models/Workouts.js";
import {
  selectCatalogue,
  withBodyweight,
  filterByGoal,
  validatePlan,
} from "../utils/programCatalogue.js";
import { generateProgram } from "../utils/programGenerator.js";
import { listProviders } from "../utils/llm/index.js";
import { usesWeightEquipment } from "../utils/weightedEquipment.js";
import { rateLimit, readRateLimit } from "../middleware/rateLimit.js";

const router = Router();

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// Each generation is a paid provider call, and a failed one can retry down the
// whole chain — so the ceiling is three upstream calls per request.
const GENERATE_LIMIT = {
  key: "programGenerate",
  limit: Number(process.env.PROGRAM_GENERATE_LIMIT) || 10,
  windowMs: 24 * 60 * 60 * 1000,
};

router.get("/providers", requireAuth, (req, res) => {
  res.json({ providers: listProviders() });
});

router.get("/quota", requireAuth, async (req, res) => {
  try {
    res.json(await readRateLimit(req.user.dbId, GENERATE_LIMIT));
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error reading quota.", error: error.message });
  }
});

// POST /api/program/generate  { scope, targetDay?, focus?, provider? }
// Writes nothing — the user reviews the proposal and applies it separately.
router.post(
  "/generate",
  requireAuth,
  rateLimit(GENERATE_LIMIT),
  async (req, res) => {
    try {
      const {
        scope = "week",
        targetDay = null,
        focus = null,
        provider,
      } = req.body;

      if (!["week", "day"].includes(scope)) {
        return res
          .status(400)
          .json({ message: "scope must be 'week' or 'day'." });
      }
      if (scope === "day" && !DAY_KEYS.includes(targetDay)) {
        return res
          .status(400)
          .json({ message: "targetDay required for scope 'day'." });
      }

      const user = await User.findById(req.user.dbId)
        .select("trainingProfile preferredWeightUnit")
        .lean();

      // No equipment selected is valid — it just means a bodyweight program.
      const equipment = withBodyweight(
        user?.trainingProfile?.availableEquipment,
      );

      const matching = await ExerciseDB.find({ equipment: { $in: equipment } })
        .select("id name bodyPart target equipment gifUrl")
        .lean();

      if (matching.length === 0) {
        return res
          .status(400)
          .json({ message: "No exercises match your equipment." });
      }

      const catalogue = selectCatalogue(
        filterByGoal(matching, user?.trainingProfile?.goal),
      );

      const result = await generateProgram({
        trainingProfile: user?.trainingProfile || {},
        catalogue,
        scope,
        targetDay,
        focus: typeof focus === "string" ? focus.slice(0, 40) : null,
        weightUnit: user?.preferredWeightUnit || "kg",
        provider,
      });

      if (!result.ok) {
        return res.status(502).json({
          message:
            result.reason === "no_provider"
              ? "No AI provider is configured."
              : "Our AI coach is busy right now. Please try again in a few minutes.",
          reason: result.reason,
          attempts: result.attempts,
        });
      }

      const fullById = new Map(
        matching.map((exercise) => [exercise.id, exercise]),
      );

      const days = result.days.map((day) => ({
        ...day,
        exercises: day.exercises.map((exercise) => {
          const details = fullById.get(exercise.exerciseId) || {};
          return {
            ...exercise,
            exerciseName: details.name || exercise.exerciseId,
            exerciseGif: details.gifUrl || "",
            bodyPart: details.bodyPart || "",
            equipment: details.equipment || "",
          };
        }),
      }));

      res.json({
        provider: result.provider,
        catalogueSize: catalogue.length,
        days,
        dropped: result.dropped,
        quota: req.rateLimit
          ? { limit: req.rateLimit.limit, remaining: req.rateLimit.remaining }
          : null,
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error generating program.", error: error.message });
    }
  },
);

// POST /api/program/apply  { scope, days }
//
// Replaces rather than merges — a whole week replaces the whole schedule, a
// single day replaces just that day. Merging would leave a bloated schedule
// nobody asked for. Existing entries are tombstoned rather than deleted, so
// past dates still show what was actually planned then.
router.post("/apply", requireAuth, async (req, res) => {
  try {
    const { scope = "week", days } = req.body;

    if (!["week", "day"].includes(scope)) {
      return res
        .status(400)
        .json({ message: "scope must be 'week' or 'day'." });
    }
    if (!Array.isArray(days) || days.length === 0) {
      return res
        .status(400)
        .json({ message: "days must be a non-empty array." });
    }
    if (scope === "day" && days.length !== 1) {
      return res
        .status(400)
        .json({ message: "scope 'day' expects exactly one day." });
    }
    if (days.some((day) => !DAY_KEYS.includes(day?.day))) {
      return res.status(400).json({ message: "Invalid day key." });
    }

    // Names and gifs come from the catalogue, never from the client.
    const ids = [
      ...new Set(
        days.flatMap((day) => (day.exercises || []).map((e) => e.exerciseId)),
      ),
    ];
    const catalogueEntries = await ExerciseDB.find({ id: { $in: ids } })
      .select("id name gifUrl equipment bodyPart")
      .lean();
    const byId = new Map(catalogueEntries.map((entry) => [entry.id, entry]));

    const unknown = ids.filter((id) => !byId.has(id));
    if (unknown.length) {
      return res.status(400).json({ message: "Unknown exercises.", unknown });
    }

    // The review screen lets users edit sets and reps, so apply can't trust
    // the numbers even though /generate validated its own output.
    const { days: validDays, dropped } = validatePlan({ days }, new Set(ids));
    if (validDays.length === 0) {
      return res
        .status(400)
        .json({ message: "No valid exercises to apply.", dropped });
    }

    let workoutDoc = await Workouts.findOne({ user: req.user.dbId });
    if (!workoutDoc) {
      workoutDoc = new Workouts({
        user: req.user.dbId,
        schedule: {
          mon: [],
          tue: [],
          wed: [],
          thu: [],
          fri: [],
          sat: [],
          sun: [],
        },
      });
    }

    const now = new Date();
    // A week replaces every day; a single day replaces only itself.
    const daysToClear =
      scope === "week" ? DAY_KEYS : validDays.map((day) => day.day);

    for (const dayKey of daysToClear) {
      for (const entry of workoutDoc.schedule[dayKey] || []) {
        if (!entry.removedOn) entry.removedOn = now;
      }
    }

    for (const day of validDays) {
      for (const exercise of day.exercises || []) {
        const details = byId.get(exercise.exerciseId);
        const reps = Array.isArray(exercise.reps)
          ? exercise.reps.map(Number)
          : [];
        const sets = Number(exercise.sets) || reps.length;

        workoutDoc.schedule[day.day].push({
          exerciseName: details.name,
          exerciseId: details.id,
          exerciseGif: details.gifUrl,
          numberOfSets: sets,
          targetReps: reps,
          // The model can't know what you can lift, so weights stay empty
          // and get filled in the first time the exercise is logged.
          usesWeight: usesWeightEquipment(details.equipment),
          targetWeight: [],
          weightUnit: "kg",
          addedOn: now,
          removedOn: null,
        });
      }
    }

    // Only store a focus that matches a real body part, so it lines up with
    // the dropdown on /schedule and /program. The model's prose labels
    // ("chest hypertrophy") don't.
    // The generated plan already names each day — use it rather than
    // discarding it, so applying a program labels the schedule too.
    for (const day of validDays) {
      if (day.focus) {
        workoutDoc.dayFocus[day.day] = day.focus.slice(0, 40);
      }
    }

    await workoutDoc.save();

    res.json({
      message: "Program applied.",
      daysApplied: validDays.map((d) => d.day),
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error applying program.", error: error.message });
  }
});

export default router;
