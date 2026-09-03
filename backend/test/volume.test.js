import test from "node:test";
import assert from "node:assert/strict";
import dayjs from "dayjs";
import {
  setVolumeKg,
  summariseExerciseEntry,
  weeklyVolume,
  exerciseHistory,
} from "../utils/volume.js";

const set = (reps, weight, unit = "kg") => ({
  setNumber: 1,
  targetReps: reps,
  repsCompleted: reps,
  weightUsed: weight,
  weightUnit: unit,
});

const entry = (date, exercises) => ({ date, day: "mon", exercises });

test("set volume is reps times load", () => {
  assert.equal(setVolumeKg(set(10, 50)), 500);
});

test("pounds are converted before multiplying", () => {
  assert.ok(Math.abs(setVolumeKg(set(10, 100, "lb")) - 453.59) < 0.1);
});

// Substituting body weight would make one total mean two different things.
test("bodyweight sets contribute reps but no tonnage", () => {
  const totals = summariseExerciseEntry({
    setsCompleted: [set(12, null), set(10, null)],
  });
  assert.equal(totals.volumeKg, 0);
  assert.equal(totals.reps, 22);
  assert.equal(totals.sets, 2);
});

test("a skipped set counts as neither a set nor reps", () => {
  const totals = summariseExerciseEntry({
    setsCompleted: [set(10, 40), { ...set(0, 40), repsCompleted: 0 }],
  });
  assert.equal(totals.sets, 1);
  assert.equal(totals.reps, 10);
});

test("top set is the heaviest load, not the last one", () => {
  const totals = summariseExerciseEntry({
    setsCompleted: [set(12, 40), set(8, 60), set(10, 50)],
  });
  assert.equal(totals.topSetKg, 60);
});

test("weekly volume returns a continuous axis including empty weeks", () => {
  const now = dayjs("2026-08-30");
  const weeks = weeklyVolume([], {}, { weeks: 6, now });
  assert.equal(weeks.length, 6);
  assert.ok(weeks.every((week) => week.volumeKg === 0));
});

test("volume is bucketed into the right week and split by body part", () => {
  const now = dayjs("2026-08-30"); // a Sunday
  const entries = [
    entry("26/08/26", [{ exercise_ID: "bench", setsCompleted: [set(10, 60)] }]),
    entry("19/08/26", [{ exercise_ID: "squat", setsCompleted: [set(5, 100)] }]),
  ];
  const weeks = weeklyVolume(
    entries,
    { bench: "chest", squat: "upper legs" },
    { weeks: 4, now },
  );

  const withVolume = weeks.filter((week) => week.volumeKg > 0);
  assert.equal(withVolume.length, 2);
  assert.equal(withVolume[0].volumeKg, 500);
  assert.equal(withVolume[0].byBodyPart[0].bodyPart, "upper legs");
  assert.equal(withVolume[1].volumeKg, 600);
  assert.equal(withVolume[1].byBodyPart[0].bodyPart, "chest");
});

test("entries older than the window are ignored", () => {
  const now = dayjs("2026-08-30");
  const weeks = weeklyVolume(
    [
      entry("01/01/26", [
        { exercise_ID: "bench", setsCompleted: [set(10, 60)] },
      ]),
    ],
    { bench: "chest" },
    { weeks: 4, now },
  );
  assert.ok(weeks.every((week) => week.volumeKg === 0));
});

test("exercise history is newest first but charts oldest first", () => {
  const entries = [
    entry("10/08/26", [{ exercise_ID: "bench", setsCompleted: [set(10, 50)] }]),
    entry("24/08/26", [{ exercise_ID: "bench", setsCompleted: [set(8, 60)] }]),
    entry("17/08/26", [{ exercise_ID: "bench", setsCompleted: [set(9, 55)] }]),
  ];
  const history = exerciseHistory(entries, "bench");

  assert.deepEqual(
    history.sessions.map((s) => s.date),
    ["24/08/26", "17/08/26", "10/08/26"],
  );
  assert.deepEqual(
    history.chart.map((p) => p.date),
    ["10/08/26", "17/08/26", "24/08/26"],
  );
  assert.deepEqual(
    history.chart.map((p) => p.value),
    [50, 55, 60],
  );
});

test("history ignores other exercises in the same session", () => {
  const entries = [
    entry("24/08/26", [
      { exercise_ID: "bench", setsCompleted: [set(8, 60)] },
      { exercise_ID: "squat", setsCompleted: [set(5, 100)] },
    ]),
  ];
  const history = exerciseHistory(entries, "bench");
  assert.equal(history.totalSessions, 1);
  assert.equal(history.best.topSet ?? history.best.topSetKg, 60);
});

test("bodyweight history charts reps instead of a flat zero", () => {
  const entries = [
    entry("10/08/26", [
      { exercise_ID: "pushup", setsCompleted: [set(20, null)] },
    ]),
    entry("17/08/26", [
      { exercise_ID: "pushup", setsCompleted: [set(25, null)] },
    ]),
  ];
  const history = exerciseHistory(entries, "pushup");
  assert.equal(history.usesWeight, false);
  assert.deepEqual(
    history.chart.map((p) => p.value),
    [20, 25],
  );
});

test("an exercise never logged returns empty rather than throwing", () => {
  const history = exerciseHistory([], "bench");
  assert.equal(history.totalSessions, 0);
  assert.deepEqual(history.chart, []);
  assert.equal(history.best.topSetKg, null);
});
