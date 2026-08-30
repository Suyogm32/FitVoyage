import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Workouts } from "../models/Workouts.js";
import { activeScheduleOnly } from "../utils/scheduleActive.js";

const router = Router();

router.put("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user.dbId;
    const { day, userExercise } = req.body;

    // addedOn/removedOn come from the server — never trust client-supplied
    // values here, or the effective-dating guarantee is worthless.
    const entry = { ...userExercise, addedOn: new Date(), removedOn: null };

    let workoutSchedule = await Workouts.findOne({ user: userId });

    if (workoutSchedule) {
      workoutSchedule.schedule[day] = [...workoutSchedule.schedule[day], entry];
      await workoutSchedule.save();
      return res.json({
        message: "Workout added to your schedule.",
        schedule: activeScheduleOnly(workoutSchedule.toObject().schedule),
      });
    } else {
      const initialSchedule = {
        mon: [],
        tue: [],
        wed: [],
        thu: [],
        fri: [],
        sat: [],
        sun: [],
      };
      initialSchedule[day] = [entry];
      workoutSchedule = new Workouts({
        user: userId,
        schedule: initialSchedule,
      });
      await workoutSchedule.save();
      return res.status(201).json({
        message: "User workout schedule created and workout added.",
        schedule: activeScheduleOnly(workoutSchedule.toObject().schedule),
      });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error processing request.", error: error.message });
  }
});

// Versioned edit — tombstones the existing entry and inserts a new one
// carrying the updated plan. Editing in place would retroactively rewrite
// what past dates claim was scheduled, which is the exact problem soft
// delete exists to prevent.
router.patch("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user.dbId;
    const { day, exerciseEntryId, updates } = req.body;

    if (!day || !exerciseEntryId || !updates) {
      return res
        .status(400)
        .json({ message: "Missing day, exerciseEntryId, or updates." });
    }

    const workoutSchedule = await Workouts.findOne({ user: userId });
    if (!workoutSchedule) {
      return res
        .status(404)
        .json({ message: "No schedule found for this user." });
    }

    const entry = (workoutSchedule.schedule[day] || []).find(
      (ex) => ex._id.toString() === exerciseEntryId,
    );
    if (!entry || entry.removedOn) {
      return res
        .status(404)
        .json({ message: "Exercise not found in that day's schedule." });
    }

    const now = new Date();
    entry.removedOn = now;

    // Identity fields carry over untouched — exerciseId especially, so
    // existing WorkoutsLog entries still match this exercise after the edit.
    workoutSchedule.schedule[day].push({
      exerciseName: entry.exerciseName,
      exerciseId: entry.exerciseId,
      exerciseGif: entry.exerciseGif,
      numberOfSets: updates.numberOfSets ?? entry.numberOfSets,
      targetReps: [...(updates.targetReps ?? entry.targetReps ?? [])],
      usesWeight: updates.usesWeight ?? entry.usesWeight,
      targetWeight: [...(updates.targetWeight ?? entry.targetWeight ?? [])],
      weightUnit: updates.weightUnit ?? entry.weightUnit,
      addedOn: now,
      removedOn: null,
    });

    await workoutSchedule.save();

    res.json({
      message: "Exercise updated.",
      schedule: activeScheduleOnly(workoutSchedule.toObject().schedule),
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating exercise.", error: error.message });
  }
});

router.delete("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user.dbId;
    const { day, exerciseEntryId } = req.body;

    if (!day || !exerciseEntryId) {
      return res
        .status(400)
        .json({ message: "Missing day or exerciseEntryId." });
    }

    const workoutSchedule = await Workouts.findOne({ user: userId });
    if (!workoutSchedule) {
      return res
        .status(404)
        .json({ message: "No schedule found for this user." });
    }

    const entry = (workoutSchedule.schedule[day] || []).find(
      (exercise) => exercise._id.toString() === exerciseEntryId,
    );
    if (!entry) {
      return res
        .status(404)
        .json({ message: "Exercise not found in that day's schedule." });
    }

    // Soft delete — the entry stays as a tombstone so past dates still
    // reflect what was actually scheduled at the time.
    if (!entry.removedOn) {
      entry.removedOn = new Date();
      await workoutSchedule.save();
    }

    res.json({
      message: "Exercise removed from schedule.",
      schedule: activeScheduleOnly(workoutSchedule.toObject().schedule),
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error removing exercise.", error: error.message });
  }
});

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// Setting a day's focus doesn't touch exercises, so it's a plain update —
// no tombstoning, nothing versioned. A label isn't part of the plan's
// history.
router.patch("/focus", requireAuth, async (req, res) => {
  try {
    const { day, focus } = req.body;

    if (!DAY_KEYS.includes(day)) {
      return res.status(400).json({ message: "Invalid day." });
    }
    if (typeof focus !== "string") {
      return res.status(400).json({ message: "focus must be a string." });
    }

    const workoutDoc = await Workouts.findOneAndUpdate(
      { user: req.user.dbId },
      { $set: { [`dayFocus.${day}`]: focus.trim().slice(0, 40) } },
      { new: true, upsert: true },
    )
      .select("dayFocus")
      .lean();

    res.json({ dayFocus: workoutDoc.dayFocus });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error saving day focus.", error: error.message });
  }
});

export default router;
