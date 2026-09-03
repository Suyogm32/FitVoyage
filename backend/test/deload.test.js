import test from "node:test";
import assert from "node:assert/strict";
import dayjs from "dayjs";
import { assessDeload, volumeRampWeeks, countBeatUp } from "../utils/deload.js";

const week = (volumeKg) => ({ weekStart: "01/01/26", volumeKg });
const session = (readiness) => ({ date: "01/01/26", readiness });

const beatUpSessions = [
  session("beat_up"),
  session("beat_up"),
  session("normal"),
  session("normal"),
  session("normal"),
];

// Four completed weeks climbing, plus a partial current week.
const climbingWeeks = [
  week(5000),
  week(6000),
  week(7000),
  week(8000),
  week(500),
];

test("counts beat-up readiness within the window only", () => {
  const sessions = [
    session("beat_up"),
    session("normal"),
    session("normal"),
    session("normal"),
    session("beat_up"), // outside the 4-session window
  ];
  assert.equal(countBeatUp(sessions), 1);
});

test("counts consecutive weekly volume increases", () => {
  assert.equal(volumeRampWeeks([week(1000), week(2000), week(3000)]), 2);
});

test("a drop resets the ramp", () => {
  assert.equal(volumeRampWeeks([week(1000), week(3000), week(2000)]), 0);
});

// The current week is always partial — comparing it to a finished one would
// report a climb every Sunday and a drop every Monday.
test("the in-progress week is excluded from the trend", () => {
  const result = assessDeload({
    sessions: beatUpSessions,
    stalledCount: 0,
    weeks: climbingWeeks,
  });
  const volume = result.signals.find((s) => s.id === "volume");
  assert.equal(volume.met, true);
});

test("two signals recommend a deload", () => {
  const result = assessDeload({
    sessions: beatUpSessions,
    stalledCount: 0,
    weeks: climbingWeeks,
  });
  assert.equal(result.metCount, 2);
  assert.equal(result.recommended, true);
});

// One bad night's sleep isn't systemic fatigue.
test("one signal alone is not enough", () => {
  const result = assessDeload({
    sessions: beatUpSessions,
    stalledCount: 0,
    weeks: [week(5000), week(4000), week(5000), week(4500), week(500)],
  });
  assert.equal(result.metCount, 1);
  assert.equal(result.recommended, false);
});

test("stalled exercises count as a signal", () => {
  const result = assessDeload({
    sessions: [
      session("normal"),
      session("normal"),
      session("normal"),
      session("normal"),
    ],
    stalledCount: 3,
    weeks: climbingWeeks,
  });
  assert.equal(result.recommended, true);
});

// "Not enough history" and "you're fine" are different answers.
test("stays quiet without enough history", () => {
  const result = assessDeload({
    sessions: [session("beat_up"), session("beat_up")],
    stalledCount: 5,
    weeks: [week(1000), week(2000)],
  });
  assert.equal(result.enoughData, false);
  assert.equal(result.recommended, false);
});

// Otherwise it reads the drop it caused as fresh evidence.
test("won't recommend again inside the cooldown", () => {
  const result = assessDeload({
    sessions: beatUpSessions,
    stalledCount: 4,
    weeks: climbingWeeks,
    lastDeloadAt: dayjs().subtract(1, "week").toDate(),
  });
  assert.equal(result.recentlyDeloaded, true);
  assert.equal(result.recommended, false);
});

test("recommends again once the cooldown has passed", () => {
  const result = assessDeload({
    sessions: beatUpSessions,
    stalledCount: 4,
    weeks: climbingWeeks,
    lastDeloadAt: dayjs().subtract(6, "week").toDate(),
  });
  assert.equal(result.recentlyDeloaded, false);
  assert.equal(result.recommended, true);
});

test("every signal explains itself whether met or not", () => {
  const result = assessDeload({
    sessions: beatUpSessions,
    weeks: climbingWeeks,
  });
  assert.equal(result.signals.length, 3);
  assert.ok(
    result.signals.every((s) => typeof s.detail === "string" && s.detail),
  );
});
