import test from "node:test";
import assert from "node:assert/strict";
import {
  parseDayInput,
  normaliseWeight,
  summariseTrend,
  resolveCurrentWeightKg,
  fromKg,
} from "../utils/bodyWeight.js";

const day = (iso) => new Date(`${iso}T00:00:00.000Z`);

test("parses YYYY-MM-DD to UTC midnight", () => {
  assert.equal(
    parseDayInput("2026-08-30").toISOString(),
    "2026-08-30T00:00:00.000Z",
  );
});

test("rejects anything that isn't a plain date string", () => {
  for (const bad of ["30/08/2026", "2026-8-3", "", null, 20260830]) {
    assert.equal(parseDayInput(bad), null);
  }
});

test("converts pounds to kilograms on the way in", () => {
  assert.ok(Math.abs(normaliseWeight(180, "lb") - 81.6466) < 0.01);
  assert.equal(normaliseWeight(80, "kg"), 80);
});

test("rejects weights outside sane bounds", () => {
  assert.equal(normaliseWeight(5, "kg"), null);
  assert.equal(normaliseWeight(900, "kg"), null);
  assert.equal(normaliseWeight("heavy", "kg"), null);
});

test("kg round-trips through lb display", () => {
  assert.ok(Math.abs(fromKg(normaliseWeight(180, "lb"), "lb") - 180) < 0.01);
});

// Comparing the last two readings would mostly measure water weight.
test("trend compares two 7-day averages, not two readings", () => {
  const now = day("2026-08-30");
  const entries = [
    { date: day("2026-08-18"), weight: 80 },
    { date: day("2026-08-20"), weight: 81 },
    { date: day("2026-08-26"), weight: 79 },
    { date: day("2026-08-29"), weight: 79.4 },
    // A single noisy spike on the last day must not swing the trend.
    { date: day("2026-08-30"), weight: 82 },
  ];
  const { changeKg } = summariseTrend(entries, now);
  const recent = (79 + 79.4 + 82) / 3;
  const prior = (80 + 81) / 2;
  assert.ok(Math.abs(changeKg - (recent - prior)) < 0.001);
});

test("no change is reported when there's no prior window to compare", () => {
  const now = day("2026-08-30");
  const { latest, changeKg } = summariseTrend(
    [{ date: day("2026-08-29"), weight: 80 }],
    now,
  );
  assert.equal(latest, 80);
  // Null, not zero — "not enough history" isn't "you haven't changed".
  assert.equal(changeKg, null);
});

test("an empty log has no latest and no trend", () => {
  assert.deepEqual(summariseTrend([]), {
    latest: null,
    latestDate: null,
    changeKg: null,
    windowDays: 7,
  });
});

test("current weight prefers the newest log entry", () => {
  const entries = [
    { date: day("2026-08-01"), weight: 84 },
    { date: day("2026-08-29"), weight: 80 },
  ];
  assert.equal(resolveCurrentWeightKg(entries, { bodyWeight: 99 }), 80);
});

test("current weight falls back to the legacy profile field", () => {
  assert.equal(resolveCurrentWeightKg([], { bodyWeight: 84 }), 84);
  assert.equal(resolveCurrentWeightKg([], {}), null);
});
