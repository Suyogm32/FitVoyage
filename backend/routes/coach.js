import { Router } from "express";
import dayjs from "dayjs"; // already imported
import { analyseHistory } from "../utils/progression.js";
import { weeklyVolume } from "../utils/volume.js";
import { assessDeload } from "../utils/deload.js";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import { requireAuth } from "../middleware/auth.js";
import { Workouts } from "../models/Workouts.js";
import { WorkoutsLog } from "../models/WorkoutsLog.js";
import { User } from "../models/User.js";
import { isActiveOn } from "../utils/scheduleActive.js";
import { buildSuggestion } from "../utils/progression.js";
import { ExerciseDB } from "../models/ExerciseDB.js";
import { withBodyweight } from "../utils/programCatalogue.js";
import { rankSubstitutes } from "../utils/substitutes.js";
dayjs.extend(customParseFormat);

const router = Router();

const DATE_FORMAT = "DD/MM/YY";

const HISTORY_DEPTH = 8;

// GET /api/coach/suggest?date=DD/MM/YY&day=mon
//
// Read-only: computes a suggestion per scheduled exercise from that
// exercise's own recent history. Phase 3 will layer an LLM adjustment on
// top of these baselines — this route must keep working if that fails.
router.get("/suggest", requireAuth, async (req, res) => {
  try {
    const userId = req.user.dbId;
    const { date, day } = req.query;

    if (!date || !day) {
      return res.status(400).json({ message: "Missing date or day." });
    }

    const refDate = dayjs(date, DATE_FORMAT, true);
    if (!refDate.isValid()) {
      return res
        .status(400)
        .json({ message: "Invalid date format. Expected DD/MM/YY." });
    }

    const [userDoc, workoutDoc, logDoc] = await Promise.all([
      User.findById(userId).select("coachMode").lean(),
      Workouts.findOne({ user: userId }).lean(),
      WorkoutsLog.findOne({ user: userId }).lean(),
    ]);

    // Coach mode is the gate — an opted-out user gets nothing, and the
    // frontend renders exactly as it did before this feature existed.
    if (!userDoc?.coachMode) {
      return res.json({ coachMode: false, suggestions: [] });
    }

    const daySchedule = (workoutDoc?.schedule?.[day] || []).filter((ex) =>
      isActiveOn(ex, refDate),
    );

    const entries = (logDoc?.exercises_done || [])
      .map((entry) => ({
        ...entry,
        parsedDate: dayjs(entry.date, DATE_FORMAT, true),
      }))
      .filter((entry) => entry.parsedDate.isValid())
      .sort((a, b) => b.parsedDate.valueOf() - a.parsedDate.valueOf());

    const todayReadiness =
      entries.find((entry) => entry.date === date && entry.day === day)
        ?.readiness || null;

    const suggestions = daySchedule.map((exercise) => {
      // History for this exercise only, excluding the session being
      // suggested for — otherwise today's own log would advise today.
      const sessions = [];
      for (const entry of entries) {
        if (entry.date === date) continue;
        const logged = entry.exercises?.find(
          (ex) => ex.exercise_ID === exercise.exerciseId,
        );
        if (!logged) continue;
        sessions.push({
          date: entry.date,
          feel: logged.feel,
          setsCompleted: logged.setsCompleted || [],
        });
        if (sessions.length >= HISTORY_DEPTH) break;
      }

      return {
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        ...buildSuggestion({ sessions, todayReadiness }),
      };
    });

    res.json({ coachMode: true, readiness: todayReadiness, suggestions });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error building suggestions.", error: error.message });
  }
});

// GET /api/coach/substitutes/:exerciseId
//
// Not gated on coachMode: a busy machine is everyone's problem, not an
// opt-in coaching opinion.
router.get("/substitutes/:exerciseId", requireAuth, async (req, res) => {
  try {
    const userId = req.user.dbId;

    const [original, userDoc, logDoc] = await Promise.all([
      ExerciseDB.findOne({ id: req.params.exerciseId })
        .select("id name bodyPart target equipment gifUrl secondaryMuscles")
        .lean(),
      User.findById(userId).select("trainingProfile").lean(),
      WorkoutsLog.findOne({ user: userId }).select("exercises_done").lean(),
    ]);

    if (!original) {
      return res.status(404).json({ message: "Exercise not found." });
    }

    const equipment = withBodyweight(
      userDoc?.trainingProfile?.availableEquipment,
    );

    const pool = await ExerciseDB.find({
      equipment: { $in: equipment },
      $or: [{ target: original.target }, { bodyPart: original.bodyPart }],
    })
      .select("id name bodyPart target equipment gifUrl secondaryMuscles")
      .lean();

    // Familiarity is worth points, and we already know what they lift on it.
    const loggedIds = new Set();
    for (const entry of logDoc?.exercises_done || []) {
      for (const exercise of entry.exercises || []) {
        loggedIds.add(exercise.exercise_ID);
      }
    }

    res.json({
      original: {
        id: original.id,
        name: original.name,
        target: original.target,
        equipment: original.equipment,
      },
      substitutes: rankSubstitutes(original, pool, { loggedIds }),
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error finding substitutes.", error: error.message });
  }
});

const STALL_DEPTH = 8;

// GET /api/coach/advisory
router.get("/advisory", requireAuth, async (req, res) => {
  try {
    const userId = req.user.dbId;

    const [userDoc, logDoc] = await Promise.all([
      User.findById(userId).select("coachMode deload").lean(),
      WorkoutsLog.findOne({ user: userId }).lean(),
    ]);

    if (!userDoc?.coachMode) {
      return res.json({ coachMode: false, recommended: false });
    }

    const entries = (logDoc?.exercises_done || [])
      .map((entry) => ({
        ...entry,
        parsedDate: dayjs(entry.date, DATE_FORMAT, true),
      }))
      .filter((entry) => entry.parsedDate.isValid())
      .sort((a, b) => b.parsedDate.valueOf() - a.parsedDate.valueOf());

    // How many distinct exercises are sitting at the same load. Reuses the
    // same fact the per-exercise stall rule reads, so the two can't disagree.
    const byExercise = new Map();
    for (const entry of entries) {
      for (const exercise of entry.exercises || []) {
        if (!byExercise.has(exercise.exercise_ID)) {
          byExercise.set(exercise.exercise_ID, []);
        }
        const sessions = byExercise.get(exercise.exercise_ID);
        if (sessions.length < STALL_DEPTH) {
          sessions.push({
            date: entry.date,
            feel: exercise.feel,
            setsCompleted: exercise.setsCompleted || [],
          });
        }
      }
    }

    let stalledCount = 0;
    for (const sessions of byExercise.values()) {
      const facts = analyseHistory(sessions, "normal");
      if (facts?.usesWeight && facts.sessionsAtLoad >= 4) stalledCount++;
    }

    const weeks = weeklyVolume(logDoc?.exercises_done || [], {}, { weeks: 8 });

    const assessment = assessDeload({
      sessions: entries.map((entry) => ({
        date: entry.date,
        readiness: entry.readiness,
      })),
      stalledCount,
      weeks,
      lastDeloadAt: userDoc.deload?.acceptedOn || null,
    });

    // Dismissing silences it for the current week only, not forever.
    const dismissedThisWeek =
      userDoc.deload?.dismissedOn &&
      dayjs(userDoc.deload.dismissedOn).isSame(dayjs(), "week");

    const acceptedThisWeek =
      userDoc.deload?.acceptedOn &&
      dayjs(userDoc.deload.acceptedOn).isSame(dayjs(), "week");

    res.json({
      coachMode: true,
      ...assessment,
      dismissedThisWeek: Boolean(dismissedThisWeek),
      acceptedThisWeek: Boolean(acceptedThisWeek),
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error building advisory.", error: error.message });
  }
});

// POST /api/coach/advisory  { action: "accept" | "dismiss" }
//
// Advisory only — accepting records the decision and nothing else. It does
// not rewrite the schedule. Silently halving someone's week would be a
// destructive action taken on the app's own initiative.
router.post("/advisory", requireAuth, async (req, res) => {
  try {
    const { action } = req.body;
    if (!["accept", "dismiss"].includes(action)) {
      return res
        .status(400)
        .json({ message: "action must be 'accept' or 'dismiss'." });
    }

    const field =
      action === "accept" ? "deload.acceptedOn" : "deload.dismissedOn";
    await User.findByIdAndUpdate(req.user.dbId, {
      $set: { [field]: new Date(), "deload.suggestedOn": new Date() },
    });

    res.json({ message: `Deload ${action}ed.` });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error saving advisory.", error: error.message });
  }
});

export default router;
