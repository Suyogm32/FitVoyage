import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Workouts } from "../models/Workouts.js";
import { WorkoutsLog } from "../models/WorkoutsLog.js";

const router = Router();

const computeStatus = (exercise, loggedExercise) => {
  if (
    !loggedExercise ||
    !loggedExercise.setsCompleted ||
    loggedExercise.setsCompleted.length === 0
  ) {
    return "incomplete";
  }
  if (loggedExercise.setsCompleted.length < exercise.numberOfSets) {
    return "partial";
  }
  const allTargetsMet = loggedExercise.setsCompleted.every(
    (s) => s.repsCompleted >= s.targetReps,
  );
  return allTargetsMet ? "completed" : "partial";
};

router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user.dbId;
    const { date, day } = req.query;

    const workoutDoc = await Workouts.findOne({ user: userId }).lean();

    if (!date || !day) {
      return res.json(workoutDoc ? [workoutDoc] : []);
    }

    const daySchedule = workoutDoc?.schedule?.[day] || [];
    const logDoc = await WorkoutsLog.findOne({ user: userId }).lean();
    const dateLog = logDoc?.exercises_done?.find(
      (entry) => entry.date === date && entry.day === day,
    );

    const merged = daySchedule.map((exercise) => {
      const loggedExercise = dateLog?.exercises?.find(
        (ex) => ex.exercise_ID === exercise.exerciseId,
      );
      return {
        ...exercise,
        status: computeStatus(exercise, loggedExercise),
        setsCompleted: loggedExercise?.setsCompleted || [],
      };
    });

    res.json(merged);
  } catch (error) {
    res.status(500).json({ message: "Error fetching schedule", error: error.message });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user.dbId;
    const { date, day, exercise_ID, setsCompleted } = req.body;

    if (
      !date ||
      !day ||
      !exercise_ID ||
      !Array.isArray(setsCompleted) ||
      setsCompleted.length === 0
    ) {
      return res.status(400).json({
        message:
          "Missing or invalid request body. Required: date, day, exercise_ID, setsCompleted (non-empty array).",
      });
    }

    let workoutLog = await WorkoutsLog.findOne({ user: userId });
    if (!workoutLog) {
      workoutLog = new WorkoutsLog({ user: userId, exercises_done: [] });
    }

    let dateEntry = workoutLog.exercises_done.find(
      (entry) => entry.date === date && entry.day === day,
    );

    if (!dateEntry) {
      workoutLog.exercises_done.push({ date, day, exercises: [] });
      dateEntry = workoutLog.exercises_done[workoutLog.exercises_done.length - 1];
    }

    const exerciseEntry = dateEntry.exercises.find(
      (ex) => ex.exercise_ID === exercise_ID,
    );

    if (exerciseEntry) {
      exerciseEntry.setsCompleted = setsCompleted;
    } else {
      dateEntry.exercises.push({ exercise_ID, setsCompleted });
    }

    await workoutLog.save();

    res.json({ message: "Exercise log saved.", exercise_ID, setsCompleted });
  } catch (error) {
    res.status(500).json({ message: "Error saving exercise log", error: error.message });
  }
});

export default router;