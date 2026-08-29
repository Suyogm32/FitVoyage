import { Router } from "express";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import { requireAuth } from "../middleware/auth.js";
import { Workouts } from "../models/Workouts.js";
import { WorkoutsLog } from "../models/WorkoutsLog.js";
import { ExerciseDB } from "../models/ExerciseDB.js";
import { isActiveOn } from "../utils/scheduleActive.js";
import {
  detectPersonalRecords,
  dedupePersonalRecords,
} from "../utils/personalRecords.js";
import { User } from "../models/User.js";

dayjs.extend(customParseFormat);

const router = Router();

const DATE_FORMAT = "DD/MM/YY";
const HEATMAP_DAYS = 84; // 12 weeks — fixed grid, doesn't follow the range
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const RANGE_DAYS = { week: 7, month: 30, year: 365 };

router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user.dbId;
    const { date, range } = req.query;

    const rangeDays = RANGE_DAYS[range] || RANGE_DAYS.month;

    const [logDoc, workoutDoc, userDoc] = await Promise.all([
      WorkoutsLog.findOne({ user: userId }).lean(),
      Workouts.findOne({ user: userId }).lean(),
      User.findById(userId).select("weeklyGoals").lean(),
    ]);

    const entries = (logDoc?.exercises_done || [])
      .map((entry) => ({
        ...entry,
        parsedDate: dayjs(entry.date, DATE_FORMAT, true),
      }))
      .filter((entry) => entry.parsedDate.isValid())
      .sort((a, b) => a.parsedDate.valueOf() - b.parsedDate.valueOf());

    const nameById = {};
    if (workoutDoc?.schedule) {
      for (const day of Object.values(workoutDoc.schedule)) {
        for (const ex of day || []) {
          nameById[ex.exerciseId] = ex.exerciseName;
        }
      }
    }

    // Logs carry their own name snapshot, which also covers ad-hoc
    // exercises that were never on the schedule.
    const logNameById = {};
    for (const entry of entries) {
      for (const ex of entry.exercises || []) {
        if (ex.exerciseName) logNameById[ex.exercise_ID] = ex.exerciseName;
      }
    }
    const resolveName = (id) => logNameById[id] || nameById[id] || id;

    const today = dayjs().startOf("day");

    // Reference point for currentWeek only — the myworkout calendar can ask
    // for a different week via ?date=. Everything else stays on real today.
    let weekReference = today;
    if (date) {
      const parsedRef = dayjs(date, DATE_FORMAT, true);
      if (parsedRef.isValid()) weekReference = parsedRef.startOf("day");
    }

    const perEntryStats = entries.map((entry) => {
      let totalReps = 0;
      let completedCount = 0;
      let partialCount = 0;

      for (const ex of entry.exercises || []) {
        const sets = ex.setsCompleted || [];
        totalReps += sets.reduce((sum, s) => sum + (s.repsCompleted || 0), 0);
        if (sets.length === 0) continue;
        const allTargetsMet = sets.every(
          (s) => s.repsCompleted >= s.targetReps,
        );
        if (allTargetsMet) completedCount++;
        else partialCount++;
      }

      return { date: entry.date, totalReps, completedCount, partialCount };
    });

    const heatmapStart = today.subtract(HEATMAP_DAYS - 1, "day");
    const statsByDate = new Map(perEntryStats.map((s) => [s.date, s]));
    const consistency = [];
    for (let i = 0; i < HEATMAP_DAYS; i++) {
      const key = heatmapStart.add(i, "day").format(DATE_FORMAT);
      const stat = statsByDate.get(key);
      consistency.push({
        date: key,
        totalReps: stat?.totalReps || 0,
        hasWorkout: Boolean(stat),
      });
    }

    const workoutDateSet = new Set(perEntryStats.map((s) => s.date));
    let currentStreak = 0;
    let cursor = workoutDateSet.has(today.format(DATE_FORMAT))
      ? today
      : today.subtract(1, "day");
    while (workoutDateSet.has(cursor.format(DATE_FORMAT))) {
      currentStreak++;
      cursor = cursor.subtract(1, "day");
    }

    let longestStreak = 0;
    let runStreak = 0;
    let prevDate = null;
    for (const entry of entries) {
      runStreak =
        prevDate && entry.parsedDate.diff(prevDate, "day") === 1
          ? runStreak + 1
          : 1;
      longestStreak = Math.max(longestStreak, runStreak);
      prevDate = entry.parsedDate;
    }

    // --- currentWeek: per-day completed vs. scheduled for weekReference's week ---
    const scheduledCountOn = (dayObj) => {
      const dayKey = DAY_KEYS[dayObj.day()];
      const list = workoutDoc?.schedule?.[dayKey] || [];
      return list.filter((ex) => isActiveOn(ex, dayObj)).length;
    };
    const completedByDate = new Map(
      perEntryStats.map((s) => [s.date, s.completedCount]),
    );

    const currentWeekStart = weekReference.startOf("week");
    const weekDays = [];
    let weekCompleted = 0;
    let weekScheduled = 0;
    for (let d = 0; d < 7; d++) {
      const day = currentWeekStart.add(d, "day");
      const scheduled = scheduledCountOn(day);
      const completed = completedByDate.get(day.format(DATE_FORMAT)) || 0;
      weekScheduled += scheduled;
      weekCompleted += completed;
      weekDays.push({
        date: day.format(DATE_FORMAT),
        dayKey: DAY_KEYS[day.day()],
        completed,
        scheduled,
      });
    }
    const currentWeek = {
      weekStart: currentWeekStart.format(DATE_FORMAT),
      weekEnd: currentWeekStart.add(6, "day").format(DATE_FORMAT),
      completed: weekCompleted,
      scheduled: weekScheduled,
      days: weekDays,
    };

    // --- Everything below follows the selected range ---
    const rangeCutoff = today.subtract(rangeDays - 1, "day");
    const entriesInRange = entries.filter(
      (e) => !e.parsedDate.isBefore(rangeCutoff, "day"),
    );
    const statsInRange = perEntryStats.filter(
      (s) => !dayjs(s.date, DATE_FORMAT, true).isBefore(rangeCutoff, "day"),
    );

    const totalCompleted = statsInRange.reduce(
      (sum, s) => sum + s.completedCount,
      0,
    );
    const totalPartial = statsInRange.reduce(
      (sum, s) => sum + s.partialCount,
      0,
    );
    const completionRate =
      totalCompleted + totalPartial > 0
        ? Math.round((totalCompleted / (totalCompleted + totalPartial)) * 100)
        : null;

    // --- Sets per muscle group: joins the log to the catalog's bodyPart ---
    const idsInRange = new Set();
    for (const entry of entriesInRange) {
      for (const ex of entry.exercises || []) idsInRange.add(ex.exercise_ID);
    }
    const catalog = await ExerciseDB.find({ id: { $in: [...idsInRange] } })
      .select("id bodyPart")
      .lean();
    const bodyPartById = Object.fromEntries(
      catalog.map((e) => [e.id, e.bodyPart]),
    );

    const muscleGroupTotals = {};
    for (const entry of entriesInRange) {
      for (const ex of entry.exercises || []) {
        const bodyPart = bodyPartById[ex.exercise_ID] || "other";
        const setCount = (ex.setsCompleted || []).filter(
          (s) => s.repsCompleted > 0,
        ).length;
        if (setCount === 0) continue;
        muscleGroupTotals[bodyPart] =
          (muscleGroupTotals[bodyPart] || 0) + setCount;
      }
    }
    // Weekly goals scaled to the selected range, so one stored number works
    // for week/month/year. Body parts with a goal but nothing logged still
    // appear — "0 of 20" is the most useful row on the chart.
    const weeklyGoals = userDoc?.weeklyGoals || [];
    const goalByBodyPart = Object.fromEntries(
      weeklyGoals.map((g) => [g.bodyPart, g.targetSets]),
    );
    const rangeWeeks = rangeDays / 7;

    const allBodyParts = new Set([
      ...Object.keys(muscleGroupTotals),
      ...Object.keys(goalByBodyPart),
    ]);

    const muscleGroups = [...allBodyParts]
      .map((bodyPart) => {
        const weeklyTarget = goalByBodyPart[bodyPart] || 0;
        return {
          bodyPart,
          sets: muscleGroupTotals[bodyPart] || 0,
          targetSets: weeklyTarget
            ? Math.round(weeklyTarget * rangeWeeks)
            : null,
        };
      })
      .sort((a, b) => b.sets - a.sets);

    const exerciseAgg = {};
    for (const entry of entriesInRange) {
      for (const ex of entry.exercises || []) {
        const key = ex.exercise_ID;
        if (!exerciseAgg[key]) {
          exerciseAgg[key] = { exercise_ID: key, sessions: 0, totalReps: 0 };
        }
        exerciseAgg[key].sessions++;
        exerciseAgg[key].totalReps += (ex.setsCompleted || []).reduce(
          (sum, s) => sum + (s.repsCompleted || 0),
          0,
        );
      }
    }
    const topExercises = Object.values(exerciseAgg)
      .map((e) => ({ ...e, exerciseName: resolveName(e.exercise_ID) }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 5);

    const allPRs = dedupePersonalRecords(detectPersonalRecords(entries));
    const personalRecords = allPRs
      .map((pr) => ({
        ...pr,
        exerciseName: resolveName(pr.exercise_ID),
        value: Math.round(pr.value * 10) / 10,
        previous: Math.round(pr.previous * 10) / 10,
      }))
      .sort(
        (a, b) =>
          dayjs(b.date, DATE_FORMAT, true).valueOf() -
          dayjs(a.date, DATE_FORMAT, true).valueOf(),
      );

    const recentPRs = personalRecords.slice(0, 5);
    const prCount = personalRecords.filter(
      (pr) => !dayjs(pr.date, DATE_FORMAT, true).isBefore(rangeCutoff, "day"),
    ).length;

    res.json({
      range: range || "month",
      rangeDays,
      currentStreak,
      longestStreak,
      completionRate,
      consistency,
      currentWeek,
      muscleGroups,
      topExercises,
      recentPRs,
      muscleGroups,
      weeklyGoals,
      prCount,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error computing progress stats.",
      error: error.message,
    });
  }
});

export default router;
