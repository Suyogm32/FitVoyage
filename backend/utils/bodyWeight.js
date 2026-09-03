import { toKg } from "./personalRecords.js";

const LB_PER_KG = 2.2046226218;
const DAY_MS = 24 * 60 * 60 * 1000;

// Sanity bounds, not medical advice — they exist to catch a typo like 700
// or a value entered in the wrong unit, not to judge anybody.
export const MIN_KG = 20;
export const MAX_KG = 500;

export const fromKg = (kg, unit) => (unit === "lb" ? kg * LB_PER_KG : kg);

export const round1 = (value) => Math.round(value * 10) / 10;

// Accepts "YYYY-MM-DD" and pins it to UTC midnight, so one calendar day is
// one document regardless of the client's timezone offset.
export const parseDayInput = (input) => {
  if (input instanceof Date) {
    return new Date(
      Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()),
    );
  }
  if (typeof input !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return null;
  }
  const date = new Date(`${input}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const startOfUtcToday = () => parseDayInput(new Date());

export const normaliseWeight = (weight, unit) => {
  const value = Number(weight);
  if (!Number.isFinite(value) || value <= 0) return null;
  const kg = toKg(value, unit === "lb" ? "lb" : "kg");
  if (kg < MIN_KG || kg > MAX_KG) return null;
  return kg;
};

const mean = (values) =>
  values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : null;

// Body weight is noisy day to day — water, food, time of day. Comparing the
// latest reading to the previous one mostly measures noise, so the trend is
// the difference between two 7-day averages instead. That's the standard
// approach and it's why "you gained 1kg overnight" doesn't show up here.
export const summariseTrend = (entries, now = new Date()) => {
  if (!entries?.length) {
    return { latest: null, latestDate: null, changeKg: null, windowDays: 7 };
  }

  const sorted = [...entries].sort(
    (a, b) => new Date(a.date) - new Date(b.date),
  );
  const last = sorted[sorted.length - 1];

  const cutoffRecent = now.getTime() - 7 * DAY_MS;
  const cutoffPrior = now.getTime() - 14 * DAY_MS;

  const inWindow = (from, to) =>
    sorted
      .filter((entry) => {
        const t = new Date(entry.date).getTime();
        return t > from && t <= to;
      })
      .map((entry) => entry.weight);

  const recent = mean(inWindow(cutoffRecent, now.getTime()));
  const prior = mean(inWindow(cutoffPrior, cutoffRecent));

  return {
    latest: last.weight,
    latestDate: last.date,
    // Null rather than zero when there isn't enough history — "no data" and
    // "no change" are different answers.
    changeKg: recent !== null && prior !== null ? recent - prior : null,
    windowDays: 7,
  };
};

// Latest logged weight in kg, falling back to the legacy single field on the
// user profile. Same shape as scheduleActive's addedOn fallback: new feature,
// old data, no migration.
export const resolveCurrentWeightKg = (entries, trainingProfile) => {
  if (entries?.length) {
    const sorted = [...entries].sort(
      (a, b) => new Date(b.date) - new Date(a.date),
    );
    return sorted[0].weight;
  }
  const legacy = Number(trainingProfile?.bodyWeight);
  return Number.isFinite(legacy) && legacy > 0 ? legacy : null;
};
