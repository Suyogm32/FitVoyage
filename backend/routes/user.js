import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";

const PROFILE_FIELDS =
  "name email preferredWeightUnit weeklyGoals coachMode trainingProfile";

const GOALS = ["build_muscle", "get_stronger", "general_fitness"];
const EXPERIENCE_LEVELS = ["beginner", "intermediate", "advanced"];

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.dbId).select(PROFILE_FIELDS);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    res.json(user);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching profile.", error: error.message });
  }
});

// Only the fields present in the request are touched, so the settings page
// can save one card at a time without clobbering the others.
const sanitiseTrainingProfile = (input) => {
  const clean = {};

  if (input.goal !== undefined) {
    if (input.goal !== null && !GOALS.includes(input.goal)) return null;
    clean["trainingProfile.goal"] = input.goal;
  }
  if (input.experience !== undefined) {
    if (
      input.experience !== null &&
      !EXPERIENCE_LEVELS.includes(input.experience)
    ) {
      return null;
    }
    clean["trainingProfile.experience"] = input.experience;
  }
  if (input.daysPerWeek !== undefined) {
    const days = Number(input.daysPerWeek);
    if (!Number.isInteger(days) || days < 1 || days > 7) return null;
    clean["trainingProfile.daysPerWeek"] = days;
  }
  if (input.availableEquipment !== undefined) {
    if (!Array.isArray(input.availableEquipment)) return null;
    clean["trainingProfile.availableEquipment"] = input.availableEquipment
      .filter((item) => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  for (const field of ["bodyWeight", "goalWeight"]) {
    if (input[field] !== undefined) {
      if (input[field] === null) {
        clean[`trainingProfile.${field}`] = null;
        continue;
      }
      const value = Number(input[field]);
      if (!Number.isFinite(value) || value <= 0) return null;
      clean[`trainingProfile.${field}`] = value;
    }
  }

  return clean;
};

router.patch("/", requireAuth, async (req, res) => {
  try {
    const { preferredWeightUnit, weeklyGoals, coachMode, trainingProfile } =
      req.body;

    if (preferredWeightUnit && !["kg", "lb"].includes(preferredWeightUnit)) {
      return res
        .status(400)
        .json({ message: "preferredWeightUnit must be 'kg' or 'lb'." });
    }

    let sanitisedGoals;
    if (weeklyGoals !== undefined) {
      if (!Array.isArray(weeklyGoals)) {
        return res
          .status(400)
          .json({ message: "weeklyGoals must be an array." });
      }
      // Drop zero/blank targets rather than storing them — "no goal" and
      // "a goal of zero" should not be different states.
      sanitisedGoals = weeklyGoals
        .filter((g) => g && typeof g.bodyPart === "string")
        .map((g) => ({
          bodyPart: g.bodyPart,
          targetSets: Math.max(0, Number(g.targetSets) || 0),
        }))
        .filter((g) => g.targetSets > 0);
    }

    let trainingProfileUpdates = {};
    if (trainingProfile !== undefined) {
      if (typeof trainingProfile !== "object" || trainingProfile === null) {
        return res
          .status(400)
          .json({ message: "trainingProfile must be an object." });
      }
      const cleaned = sanitiseTrainingProfile(trainingProfile);
      if (cleaned === null) {
        return res
          .status(400)
          .json({ message: "Invalid trainingProfile values." });
      }
      trainingProfileUpdates = cleaned;
    }

    const user = await User.findByIdAndUpdate(
      req.user.dbId,
      {
        $set: {
          ...(preferredWeightUnit && { preferredWeightUnit }),
          ...(typeof coachMode === "boolean" && { coachMode }),
          ...(sanitisedGoals !== undefined && { weeklyGoals: sanitisedGoals }),
          ...trainingProfileUpdates,
        },
      },
      { new: true },
    ).select(PROFILE_FIELDS);

    res.json(user);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating profile.", error: error.message });
  }
});

export default router;
