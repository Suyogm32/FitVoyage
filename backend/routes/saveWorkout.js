import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Workouts } from "../models/Workouts.js";

const router = Router();

router.put("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user.dbId;
    const { day, userExercise } = req.body;

    let workoutSchedule = await Workouts.findOne({ user: userId });

    if (workoutSchedule) {
      workoutSchedule.schedule[day] = [
        ...workoutSchedule.schedule[day],
        userExercise,
      ];
      await workoutSchedule.save();
      return res.json({
        message: "Workout added to your schedule.",
        schedule: workoutSchedule.schedule,
      });
    } else {
      const initialSchedule = {
        mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [],
      };
      initialSchedule[day] = [userExercise];
      workoutSchedule = new Workouts({ user: userId, schedule: initialSchedule });
      await workoutSchedule.save();
      return res.status(201).json({
        message: "User workout schedule created and workout added.",
        schedule: workoutSchedule.schedule,
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Error processing request.", error: error.message });
  }
});

router.delete("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user.dbId;
    const { day, exerciseEntryId } = req.body;

    if (!day || !exerciseEntryId) {
      return res.status(400).json({ message: "Missing day or exerciseEntryId." });
    }

    const workoutSchedule = await Workouts.findOne({ user: userId });
    if (!workoutSchedule) {
      return res.status(404).json({ message: "No schedule found for this user." });
    }

    workoutSchedule.schedule[day] = workoutSchedule.schedule[day].filter(
      (exercise) => exercise._id.toString() !== exerciseEntryId,
    );
    await workoutSchedule.save();

    res.json({ message: "Exercise removed from schedule.", schedule: workoutSchedule.schedule });
  } catch (error) {
    res.status(500).json({ message: "Error removing exercise.", error: error.message });
  }
});

export default router;