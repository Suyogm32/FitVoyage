import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import { toKg, estimateOneRepMax } from "./personalRecords.js";

dayjs.extend(customParseFormat);

export const DATE_FORMAT = "DD/MM/YY";

export const parseLogDate = (value) => {
  const parsed = dayjs(value, DATE_FORMAT, true);
  return parsed.isValid() ? parsed : null;
};

// Tonnage counts loaded work only. A bodyweight set records no load, and
// substituting the user's body weight would make one number mean two
// different things. Reps are reported alongside so bodyweight work isn't
// invisible — it's just counted in the unit that fits it.
export const setVolumeKg = (set) => {
  if (!set?.weightUsed) return 0;
  return (
    toKg(set.weightUsed, set.weightUnit || "kg") * (set.repsCompleted || 0)
  );
};

export const summariseExerciseEntry = (exercise) => {
  const sets = exercise?.setsCompleted || [];
  let volumeKg = 0;
  let reps = 0;
  let topSetKg = 0;
  let bestOneRepMax = 0;

  for (const set of sets) {
    const kg = set.weightUsed
      ? toKg(set.weightUsed, set.weightUnit || "kg")
      : 0;
    volumeKg += setVolumeKg(set);
    reps += set.repsCompleted || 0;
    if (kg > topSetKg) topSetKg = kg;
    if (kg && set.repsCompleted) {
      bestOneRepMax = Math.max(
        bestOneRepMax,
        estimateOneRepMax(kg, set.repsCompleted),
      );
    }
  }

  return {
    sets: sets.filter((set) => (set.repsCompleted || 0) > 0).length,
    reps,
    volumeKg,
    topSetKg,
    bestOneRepMax,
  };
};

// Weeks are Sunday-start to match DAY_KEYS and the rest of the app.
// Empty weeks are included so the chart has a continuous axis — a gap in the
// data should read as "trained nothing", not as a shorter timeline.
export const weeklyVolume = (
  entries,
  bodyPartById = {},
  { weeks = 12, now = dayjs() } = {},
) => {
  const thisWeek = now.startOf("week");
  const buckets = new Map();

  for (let i = weeks - 1; i >= 0; i--) {
    const start = thisWeek.subtract(i, "week");
    buckets.set(start.format(DATE_FORMAT), {
      weekStart: start.format(DATE_FORMAT),
      volumeKg: 0,
      sets: 0,
      reps: 0,
      byBodyPart: {},
    });
  }

  const earliest = thisWeek.subtract(weeks - 1, "week");

  for (const entry of entries || []) {
    const date = parseLogDate(entry.date);
    if (!date || date.isBefore(earliest, "day")) continue;

    const key = date.startOf("week").format(DATE_FORMAT);
    const bucket = buckets.get(key);
    if (!bucket) continue;

    for (const exercise of entry.exercises || []) {
      const totals = summariseExerciseEntry(exercise);
      if (totals.sets === 0) continue;

      const bodyPart = bodyPartById[exercise.exercise_ID] || "other";
      bucket.volumeKg += totals.volumeKg;
      bucket.sets += totals.sets;
      bucket.reps += totals.reps;
      bucket.byBodyPart[bodyPart] =
        (bucket.byBodyPart[bodyPart] || 0) + totals.volumeKg;
    }
  }

  return [...buckets.values()].map((bucket) => ({
    ...bucket,
    volumeKg: Math.round(bucket.volumeKg),
    byBodyPart: Object.entries(bucket.byBodyPart)
      .map(([bodyPart, kg]) => ({ bodyPart, volumeKg: Math.round(kg) }))
      .sort((a, b) => b.volumeKg - a.volumeKg),
  }));
};

// Every session that included one exercise, newest first, plus lifetime bests.
export const exerciseHistory = (entries, exerciseId, { limit = 30 } = {}) => {
  const sessions = [];

  for (const entry of entries || []) {
    const date = parseLogDate(entry.date);
    if (!date) continue;

    for (const exercise of entry.exercises || []) {
      if (exercise.exercise_ID !== exerciseId) continue;

      // summariseExerciseEntry returns `sets` as a count; this object needs
      // `sets` to be the array. Renamed on the way out so a spread can't
      // silently overwrite one with the other.
      const { sets: setCount, ...totals } = summariseExerciseEntry(exercise);
      if (setCount === 0) continue;

      sessions.push({
        date: entry.date,
        sortKey: date.valueOf(),
        exerciseName: exercise.exerciseName || "",
        feel: exercise.feel || null,
        unplanned: Boolean(exercise.unplanned),
        setCount,
        ...totals,
        sets: (exercise.setsCompleted || []).map((set) => ({
          setNumber: set.setNumber,
          reps: set.repsCompleted || 0,
          targetReps: set.targetReps ?? null,
          weightKg: set.weightUsed
            ? Math.round(toKg(set.weightUsed, set.weightUnit || "kg") * 10) / 10
            : null,
        })),
      });
    }
  }

  sessions.sort((a, b) => b.sortKey - a.sortKey);

  const usesWeight = sessions.some((session) => session.topSetKg > 0);

  const best = sessions.reduce(
    (acc, session) => {
      if (session.topSetKg > acc.topSetKg) {
        acc.topSetKg = session.topSetKg;
        acc.topSetDate = session.date;
      }
      if (session.bestOneRepMax > acc.oneRepMax) {
        acc.oneRepMax = session.bestOneRepMax;
      }
      const bestReps = Math.max(0, ...session.sets.map((set) => set.reps));
      if (bestReps > acc.mostReps) {
        acc.mostReps = bestReps;
        acc.mostRepsDate = session.date;
      }
      return acc;
    },
    {
      topSetKg: 0,
      topSetDate: null,
      oneRepMax: 0,
      mostReps: 0,
      mostRepsDate: null,
    },
  );

  return {
    usesWeight,
    // Oldest first for the chart — a time axis reads left to right.
    // Weighted exercises chart their top set; bodyweight ones chart reps,
    // because a flat line at zero tells you nothing.
    chart: [...sessions]
      .sort((a, b) => a.sortKey - b.sortKey)
      .map((session) => ({
        date: session.date,
        value: usesWeight
          ? Math.round(session.topSetKg * 10) / 10
          : session.reps,
      })),
    sessions: sessions.slice(0, limit).map(({ sortKey, ...rest }) => rest),
    totalSessions: sessions.length,
    best: {
      topSetKg: Math.round(best.topSetKg * 10) / 10 || null,
      topSetDate: best.topSetDate,
      oneRepMax: Math.round(best.oneRepMax * 10) / 10 || null,
      mostReps: best.mostReps || null,
      mostRepsDate: best.mostRepsDate,
    },
  };
};
