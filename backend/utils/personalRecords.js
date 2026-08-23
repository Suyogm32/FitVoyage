const LB_TO_KG = 0.45359237;

// Users pick kg or lb per exercise, so every comparison must happen in one
// canonical unit or "100 lb" would beat "50 kg".
export const toKg = (weight, unit) => (unit === "lb" ? weight * LB_TO_KG : weight);

// Epley. Reasonable up to ~10 reps; drifts optimistic beyond that.
export const estimateOneRepMax = (weightKg, reps) => {
  if (!weightKg || !reps) return 0;
  return weightKg * (1 + reps / 30);
};

// Walks the log chronologically and emits an event every time a set beats
// the running best for that exercise. Computed on read rather than flagged
// at write time — past logs are editable, and stored flags would go stale.
export const detectPersonalRecords = (entries) => {
  const best = {};
  const events = [];

  for (const entry of entries) {
    for (const ex of entry.exercises || []) {
      const id = ex.exercise_ID;
      if (!best[id]) {
        best[id] = { weightKg: 0, oneRepMax: 0, reps: 0, seen: false };
      }
      const record = best[id];

      for (const set of ex.setsCompleted || []) {
        const reps = set.repsCompleted || 0;
        if (reps <= 0) continue; // skipped set

        const weightKg = set.weightUsed
          ? toKg(set.weightUsed, set.weightUnit || "kg")
          : 0;
        const oneRepMax = estimateOneRepMax(weightKg, reps);

        // The first logged set for an exercise only sets the baseline —
        // counting it would mark every newly added exercise as a PR.
        if (record.seen) {
          if (weightKg > record.weightKg) {
            events.push({
              exercise_ID: id, type: "weight", date: entry.date,
              value: weightKg, previous: record.weightKg, reps,
            });
          }
          if (oneRepMax > record.oneRepMax) {
            events.push({
              exercise_ID: id, type: "oneRepMax", date: entry.date,
              value: oneRepMax, previous: record.oneRepMax, reps,
            });
          }
          if (reps > record.reps) {
            events.push({
              exercise_ID: id, type: "reps", date: entry.date,
              value: reps, previous: record.reps, weightKg,
            });
          }
        }

        record.weightKg = Math.max(record.weightKg, weightKg);
        record.oneRepMax = Math.max(record.oneRepMax, oneRepMax);
        record.reps = Math.max(record.reps, reps);
        record.seen = true;
      }
    }
  }

  return events;
};

// A weight PR almost always drags a 1RM PR along with it — showing both is
// noise. Keep the strongest signal per exercise per day.
const TYPE_PRIORITY = { weight: 3, oneRepMax: 2, reps: 1 };

export const dedupePersonalRecords = (events) => {
  const bestPerKey = new Map();
  for (const event of events) {
    const key = `${event.exercise_ID}|${event.date}`;
    const existing = bestPerKey.get(key);
    if (!existing || TYPE_PRIORITY[event.type] > TYPE_PRIORITY[existing.type]) {
      bestPerKey.set(key, event);
    }
  }
  return [...bestPerKey.values()];
};