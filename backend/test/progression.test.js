import test from "node:test";
import assert from "node:assert/strict";
import { buildSuggestion } from "../utils/progression.js";

// Helpers keep the intent of each case visible instead of burying it in
// object literals.
const set = (setNumber, targetReps, repsCompleted, weightUsed = null) => ({
  setNumber,
  targetReps,
  repsCompleted,
  weightUsed,
});

const session = (sets, feel = null, date = "01/08/26") => ({
  date,
  feel,
  setsCompleted: sets,
});

const suggest = (sessions, todayReadiness = null) =>
  buildSuggestion({ sessions, todayReadiness });

test("no history yields no suggestion", () => {
  const result = suggest([]);
  assert.equal(result.action, "none");
  assert.equal(result.reason, "no_history");
});

test("hitting every target steps the load up", () => {
  const result = suggest([session([set(1, 10, 10, 40)])]);
  assert.equal(result.action, "increase");
  assert.equal(result.ruleId, "increase-standard");
});

test("an ascending ladder shifts every rung up one", () => {
  // 30/35/40 -> 35/40/42.5: each set inherits a load already handled,
  // only the top set is new.
  const result = suggest([
    session([set(1, 15, 15, 30), set(2, 12, 12, 35), set(3, 10, 10, 40)]),
  ]);
  assert.equal(result.method, "ladder_shift");
  assert.deepEqual(result.suggestedWeights, [35, 40, 42.5]);
  // Reps stay on plan — the ladder progresses load, not reps.
  assert.deepEqual(result.suggestedReps, [15, 12, 10]);
});

test("flat sets use the percentage path, not the ladder", () => {
  const result = suggest([
    session([set(1, 10, 10, 40), set(2, 10, 10, 40), set(3, 10, 10, 40)]),
  ]);
  assert.equal(result.method, "percentage");
});

test("an increase never rounds back to the same weight", () => {
  // 14kg isn't on the 1.25 grid: +2.5% rounds down to 13.75, which would
  // report an "increase" that lowers the weight.
  const result = suggest([session([set(1, 10, 10, 14)])]);
  assert.equal(result.action, "increase");
  assert.deepEqual(result.suggestedWeights, [15]);
});

test("hold repeats the exact weight, with no grid rounding", () => {
  // Missing a target holds. 18.5 must come back as 18.5, not snapped to
  // 18.75 — otherwise "repeat this weight" shows a different number.
  const result = suggest([session([set(1, 15, 12, 18.5)])]);
  assert.equal(result.action, "hold");
  assert.deepEqual(result.suggestedWeights, [18.5]);
});

test("two missed sessions in a row trigger a deload", () => {
  const missed = session([set(1, 10, 8, 30)]);
  const result = suggest([missed, missed]);
  assert.equal(result.action, "deload");
  assert.equal(result.ruleId, "deload-after-repeated-misses");
  assert.deepEqual(result.suggestedWeights, [27.5]);
});

test("a struggle holds even when every target was met", () => {
  const result = suggest([session([set(1, 10, 10, 40)], "struggled")]);
  assert.equal(result.action, "hold");
  assert.equal(result.ruleId, "hold-when-struggled");
});

test("feeling beat up outranks an easy session", () => {
  // Rule priority matters: readiness is about today, the easy feel was
  // about last time.
  const result = suggest([session([set(1, 10, 10, 40)], "easy")], "beat_up");
  assert.equal(result.action, "hold");
  assert.equal(result.ruleId, "hold-when-beat-up");
});

test("an easy session outranks the standard increase", () => {
  const result = suggest([session([set(1, 10, 10, 40)], "easy")]);
  assert.equal(result.ruleId, "increase-when-easy");
});

test("bodyweight work progresses by reps, not load", () => {
  const result = suggest([session([set(1, 15, 15, null)])]);
  assert.equal(result.usesWeight, false);
  assert.deepEqual(result.suggestedReps, [20]);
  assert.deepEqual(result.suggestedWeights, [null]);
});

test("a missing feel is treated as neutral, not as a blocker", () => {
  // Basic-mode users and older logs have no feel recorded.
  const result = suggest([session([set(1, 10, 10, 40)], null)]);
  assert.equal(result.action, "increase");
  assert.equal(result.ruleId, "increase-standard");
});