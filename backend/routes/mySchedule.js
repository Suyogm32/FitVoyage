import { Router } from "express";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import { requireAuth } from "../middleware/auth.js";
import { Workouts } from "../models/Workouts.js";
import { WorkoutsLog } from "../models/WorkoutsLog.js";
import { ExerciseDB } from "../models/ExerciseDB.js";
import { isActiveOn, activeScheduleOnly } from "../utils/scheduleActive.js";

dayjs.extend(customParseFormat);

const router = Router();

const DATE_FORMAT = "DD/MM/YY";

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

    // No params → the full current weekly plan (used by /schedule).
    if (!date || !day) {
      if (!workoutDoc) return res.json([]);
      return res.json([
        { ...workoutDoc, schedule: activeScheduleOnly(workoutDoc.schedule) },
      ]);
    }

    const refDate = dayjs(date, DATE_FORMAT, true);
    if (!refDate.isValid()) {
      return res
        .status(400)
        .json({ message: "Invalid date format. Expected DD/MM/YY." });
    }

    const daySchedule = (workoutDoc?.schedule?.[day] || []).filter((ex) =>
      isActiveOn(ex, refDate),
    );

    const logDoc = await WorkoutsLog.findOne({ user: userId }).lean();
    const dateLog = logDoc?.exercises_done?.find(
      (entry) => entry.date === date && entry.day === day,
    );

    const merged = daySchedule.map((exercise) => {
      const loggedExercise = dateLog?.exercises?.find(
        (ex) => ex.exercise_ID === exercise.exerciseId,
      );
      // Nothing logged against this exercise directly — but something may
      // have been logged *in place of* it. That counts as done.
      const substitute = loggedExercise
        ? null
        : dateLog?.exercises?.find(
            (ex) => ex.substitutedFor === exercise.exerciseId,
          );

      const effective = loggedExercise || substitute;

      return {
        ...exercise,
        unplanned: false,
        status: computeStatus(exercise, effective),
        setsCompleted: effective?.setsCompleted || [],
        substitutedBy: substitute
          ? {
              exerciseId: substitute.exercise_ID,
              exerciseName: substitute.exerciseName || substitute.exercise_ID,
            }
          : null,
      };
    });

    const scheduledIds = new Set(daySchedule.map((ex) => ex.exerciseId));
    const unplanned = (dateLog?.exercises || []).filter(
      (ex) =>
        !scheduledIds.has(ex.exercise_ID) &&
        // Substitutes are already represented by the entry they replaced.
        !(ex.substitutedFor && scheduledIds.has(ex.substitutedFor)),
    );

    res.json([...merged, ...unplanned]);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching schedule", error: error.message });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user.dbId;
    const { date, day, exercise_ID, setsCompleted, feel, substitutedFor } =
      req.body;

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

    const parsedDate = dayjs(date, DATE_FORMAT, true);
    if (!parsedDate.isValid()) {
      return res
        .status(400)
        .json({ message: "Invalid date format. Expected DD/MM/YY." });
    }
    if (parsedDate.isAfter(dayjs(), "day")) {
      return res
        .status(400)
        .json({ message: "Cannot log a workout for a future date." });
    }

    // Whether this was planned is decided server-side from the effective
    // schedule — never taken from the client. Name/gif are resolved here
    // too, so the log carries its own display data.
    const workoutDoc = await Workouts.findOne({ user: userId }).lean();
    const daySchedule = (workoutDoc?.schedule?.[day] || []).filter((ex) =>
      isActiveOn(ex, parsedDate),
    );
    const planned = daySchedule.find((ex) => ex.exerciseId === exercise_ID);

    // A substitution has to stand in for something actually on the plan for
    // that day, and can't stand in for itself. Validated against the
    // effective schedule rather than trusted from the client — same rule as
    // `planned` above.
    let safeSubstitutedFor = null;
    if (substitutedFor) {
      const target = daySchedule.find(
        (ex) =>
          ex.exerciseId === substitutedFor && ex.exerciseId !== exercise_ID,
      );
      if (!target) {
        return res
          .status(400)
          .json({ message: "substitutedFor must be scheduled for this day." });
      }
      safeSubstitutedFor = substitutedFor;
    }

    let exerciseName;
    let exerciseGif;
    if (planned) {
      exerciseName = planned.exerciseName;
      exerciseGif = planned.exerciseGif;
    } else {
      const catalogEntry = await ExerciseDB.findOne({ id: exercise_ID }).lean();
      if (!catalogEntry) {
        return res.status(400).json({ message: "Unknown exercise." });
      }
      exerciseName = catalogEntry.name;
      exerciseGif = catalogEntry.gifUrl;
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
      dateEntry =
        workoutLog.exercises_done[workoutLog.exercises_done.length - 1];
    }

    const exerciseEntry = dateEntry.exercises.find(
      (ex) => ex.exercise_ID === exercise_ID,
    );

    const FEELS = ["easy", "just_right", "struggled"];
    const safeFeel = FEELS.includes(feel) ? feel : null;

    if (exerciseEntry) {
      exerciseEntry.setsCompleted = setsCompleted;
      exerciseEntry.exerciseName = exerciseName;
      exerciseEntry.exerciseGif = exerciseGif;
      // A substitute isn't "extra" work — it replaced planned work, so it
      // shouldn't be badged as unplanned or counted as a bonus exercise.
      exerciseEntry.unplanned = !planned && !safeSubstitutedFor;
      exerciseEntry.substitutedFor = safeSubstitutedFor;
      exerciseEntry.feel = safeFeel;
    } else {
      dateEntry.exercises.push({
        exercise_ID,
        exerciseName,
        exerciseGif,
        unplanned: !planned && !safeSubstitutedFor,
        substitutedFor: safeSubstitutedFor,
        feel: safeFeel,
        setsCompleted,
      });
    }

    await workoutLog.save();

    res.json({ message: "Exercise log saved.", exercise_ID, setsCompleted });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error saving exercise log", error: error.message });
  }
});

// Session-level readiness. Separate from the exercise log so it can be
// recorded when the day is opened, before anything has been logged.
router.get("/readiness", requireAuth, async (req, res) => {
  try {
    const { date, day } = req.query;
    if (!date || !day) {
      return res.status(400).json({ message: "Missing date or day." });
    }
    const logDoc = await WorkoutsLog.findOne({ user: req.user.dbId }).lean();
    const entry = logDoc?.exercises_done?.find(
      (e) => e.date === date && e.day === day,
    );
    res.json({ readiness: entry?.readiness || null });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching readiness.", error: error.message });
  }
});

router.post("/readiness", requireAuth, async (req, res) => {
  try {
    const { date, day, readiness } = req.body;
    const READINESS = ["fresh", "normal", "beat_up"];

    if (!date || !day || !READINESS.includes(readiness)) {
      return res.status(400).json({
        message: "Required: date, day, readiness (fresh | normal | beat_up).",
      });
    }

    const parsedDate = dayjs(date, DATE_FORMAT, true);
    if (!parsedDate.isValid()) {
      return res
        .status(400)
        .json({ message: "Invalid date format. Expected DD/MM/YY." });
    }
    if (parsedDate.isAfter(dayjs(), "day")) {
      return res
        .status(400)
        .json({ message: "Cannot check in for a future date." });
    }

    let workoutLog = await WorkoutsLog.findOne({ user: req.user.dbId });
    if (!workoutLog) {
      workoutLog = new WorkoutsLog({ user: req.user.dbId, exercises_done: [] });
    }

    let dateEntry = workoutLog.exercises_done.find(
      (entry) => entry.date === date && entry.day === day,
    );
    if (!dateEntry) {
      workoutLog.exercises_done.push({ date, day, exercises: [] });
      dateEntry =
        workoutLog.exercises_done[workoutLog.exercises_done.length - 1];
    }

    dateEntry.readiness = readiness;
    await workoutLog.save();

    res.json({ readiness });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error saving readiness.", error: error.message });
  }
});

// The whole focus map in one call — used by /schedule to label days, by
// /myworkout for the greeting, and by /program to prefill muscle focus.
router.get("/focus", requireAuth, async (req, res) => {
  try {
    const workoutDoc = await Workouts.findOne({ user: req.user.dbId })
      .select("dayFocus")
      .lean();
    res.json({ dayFocus: workoutDoc?.dayFocus || {} });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching day focus.", error: error.message });
  }
});

export default router;
