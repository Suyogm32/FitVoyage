import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { ExerciseDB } from "../models/ExerciseDB.js";
import { generateProgram } from "../utils/programGenerator.js";
import { listProviders } from "../utils/llm/index.js";
import { selectCatalogue,
  withBodyweight,
  filterByGoal,
} from "../utils/programCatalogue.js";
const router = Router();

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// Which providers actually have keys configured — lets the UI offer a
// choice while comparing output.
router.get("/providers", requireAuth, (req, res) => {
  res.json({ providers: listProviders() });
});

// POST /api/program/generate  { scope: "week"|"day", targetDay?, provider? }
//
// Writes nothing. Safe to call repeatedly — the user reviews the proposal
// and applies it separately.
router.post("/generate", requireAuth, async (req, res) => {
  try {
    const { scope = "week", targetDay = null, provider } = req.body;

    if (!["week", "day"].includes(scope)) {
      return res.status(400).json({ message: "scope must be 'week' or 'day'." });
    }
    if (scope === "day" && !DAY_KEYS.includes(targetDay)) {
      return res.status(400).json({ message: "targetDay required for scope 'day'." });
    }

    const user = await User.findById(req.user.dbId)
      .select("trainingProfile preferredWeightUnit")
      .lean();

    // No equipment selected is a valid state — it just means a bodyweight
    // program, so there's nothing to reject here.
    const equipment = withBodyweight(user?.trainingProfile?.availableEquipment);

    if (equipment.length === 0) {
      return res.status(400).json({
        message: "Set your available equipment in Settings before generating a program.",
      });
    }

    const matching = await ExerciseDB.find({ equipment: { $in: equipment } })
      .select("id name bodyPart target equipment gifUrl")
      .lean();

    if (matching.length === 0) {
      return res.status(400).json({ message: "No exercises match your equipment." });
    }

    const catalogue = selectCatalogue(
      filterByGoal(matching, user?.trainingProfile?.goal),
    );

    const result = await generateProgram({
      trainingProfile: user?.trainingProfile || {},
      catalogue,
      scope,
      targetDay,
      weightUnit: user?.preferredWeightUnit || "kg",
      provider,
    });

    if (!result.ok) {
      return res.status(502).json({
        message:
          result.reason === "no_provider"
            ? "No AI provider is configured."
            : "Couldn't generate a program right now. Please try again.",
        reason: result.reason,
      });
    }

    // Attach names and gifs so the review screen can render without a
    // second round trip.
    const byId = new Map(catalogue.map((exercise) => [exercise.id, exercise]));
    const fullById = new Map(matching.map((exercise) => [exercise.id, exercise]));

    const days = result.days.map((day) => ({
      ...day,
      exercises: day.exercises.map((exercise) => {
        const details = byId.get(exercise.exerciseId) || {};
        const full = fullById.get(exercise.exerciseId) || {};
        return {
          ...exercise,
          exerciseName: details.name || exercise.exerciseId,
          exerciseGif: full.gifUrl || "",
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
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error generating program.", error: error.message });
  }
});

export default router;