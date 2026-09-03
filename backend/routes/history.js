import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { WorkoutsLog } from "../models/WorkoutsLog.js";
import { ExerciseDB } from "../models/ExerciseDB.js";
import { User } from "../models/User.js";
import { fromKg, round1 } from "../utils/bodyWeight.js";
import {
  weeklyVolume,
  exerciseHistory,
  parseLogDate,
} from "../utils/volume.js";

const router = Router();

const MAX_WEEKS = 52;

// The log stores "DD/MM/YY" strings, which no Date constructor can parse and
// which sort wrong lexically. These endpoints are new, so they emit ISO and
// let the client decide how to display it.
const toIso = (value) => {
  const parsed = parseLogDate(value);
  return parsed ? parsed.toISOString() : null;
};

// GET /api/history/exercise/:exerciseId
router.get("/exercise/:exerciseId", requireAuth, async (req, res) => {
  try {
    const [logDoc, user, catalogue] = await Promise.all([
      WorkoutsLog.findOne({ user: req.user.dbId }).lean(),
      User.findById(req.user.dbId).select("preferredWeightUnit").lean(),
      ExerciseDB.findOne({ id: req.params.exerciseId })
        .select("id name bodyPart")
        .lean(),
    ]);

    const unit = user?.preferredWeightUnit || "kg";
    const history = exerciseHistory(
      logDoc?.exercises_done || [],
      req.params.exerciseId,
    );

    // Stored in kg, shown in the user's unit — same rule as body weight.
    const convert = (kg) =>
      kg === null || kg === undefined ? null : round1(fromKg(kg, unit));

    res.json({
      exerciseId: req.params.exerciseId,
      exerciseName: catalogue?.name || history.sessions[0]?.exerciseName || "",
      unit,
      usesWeight: history.usesWeight,
      totalSessions: history.totalSessions,
      chart: history.chart.map((point) => ({
        date: toIso(point.date),
        value: history.usesWeight ? convert(point.value) : point.value,
      })),
      sessions: history.sessions.map((session) => ({
        date: toIso(session.date),
        setCount: session.setCount,
        reps: session.reps,
        feel: session.feel,
        unplanned: session.unplanned,
        volume: convert(session.volumeKg),
        topSet: convert(session.topSetKg) || null,
        sets: session.sets.map((set) => ({
          setNumber: set.setNumber,
          reps: set.reps,
          targetReps: set.targetReps,
          weight: convert(set.weightKg),
        })),
      })),
      best: {
        topSet: convert(history.best.topSetKg),
        topSetDate: toIso(history.best.topSetDate),
        oneRepMax: convert(history.best.oneRepMax),
        mostReps: history.best.mostReps,
        mostRepsDate: toIso(history.best.mostRepsDate),
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Error loading exercise history.",
      error: error.message,
    });
  }
});

// GET /api/history/volume?weeks=12
router.get("/volume", requireAuth, async (req, res) => {
  try {
    const weeks = Math.min(
      MAX_WEEKS,
      Math.max(4, Number(req.query.weeks) || 12),
    );

    const [logDoc, user] = await Promise.all([
      WorkoutsLog.findOne({ user: req.user.dbId }).lean(),
      User.findById(req.user.dbId).select("preferredWeightUnit").lean(),
    ]);

    const entries = logDoc?.exercises_done || [];
    const ids = new Set();
    for (const entry of entries) {
      for (const exercise of entry.exercises || []) {
        ids.add(exercise.exercise_ID);
      }
    }

    const catalogue = await ExerciseDB.find({ id: { $in: [...ids] } })
      .select("id bodyPart")
      .lean();
    const bodyPartById = Object.fromEntries(
      catalogue.map((entry) => [entry.id, entry.bodyPart]),
    );

    const unit = user?.preferredWeightUnit || "kg";
    const weeksData = weeklyVolume(entries, bodyPartById, { weeks });

    res.json({
      unit,
      weeks: weeksData.map((week) => ({
        weekStart: toIso(week.weekStart),
        sets: week.sets,
        reps: week.reps,
        volume: Math.round(fromKg(week.volumeKg, unit)),
        byBodyPart: week.byBodyPart.map((row) => ({
          bodyPart: row.bodyPart,
          volume: Math.round(fromKg(row.volumeKg, unit)),
        })),
      })),
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error computing volume.", error: error.message });
  }
});

export default router;
