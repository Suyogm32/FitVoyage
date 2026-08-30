import test from "node:test";
import assert from "node:assert/strict";
import {
  selectCatalogue,
  deriveDirection,
  validatePlan,
  withBodyweight,
  filterByGoal,
} from "../utils/programCatalogue.js";

const exercise = (id, name, bodyPart, equipment) => ({
  id,
  name,
  bodyPart,
  equipment,
  target: "n/a",
});

// Trimming only kicks in above a pool-size threshold, so tests that
// exercise the trimming logic itself force it on with minTrimThreshold: 0.
test("caps how many exercises one equipment type contributes", () => {
  const chest = Array.from({ length: 20 }, (_, i) =>
    exercise(`d${i}`, `dumbbell press variation ${i}`, "chest", "dumbbell"),
  );
  const selected = selectCatalogue(chest, {
    maxPerEquipment: 5,
    minTrimThreshold: 0,
  });
  assert.equal(selected.length, 5);
});

test("keeps variety across equipment within a body part", () => {
  const chest = [
    ...Array.from({ length: 10 }, (_, i) =>
      exercise(`d${i}`, `db press ${i}`, "chest", "dumbbell"),
    ),
    ...Array.from({ length: 10 }, (_, i) =>
      exercise(`b${i}`, `bb press ${i}`, "chest", "barbell"),
    ),
  ];
  const selected = selectCatalogue(chest, {
    maxPerEquipment: 3,
    minTrimThreshold: 0,
  });
  const equipmentUsed = new Set(selected.map((e) => e.equipment));
  assert.deepEqual([...equipmentUsed].sort(), ["barbell", "dumbbell"]);
});

test("prefers shorter names as a proxy for staple movements", () => {
  const chest = [
    exercise(
      "a",
      "barbell bench press with chains on a smith machine",
      "chest",
      "barbell",
    ),
    exercise("b", "barbell bench press", "chest", "barbell"),
  ];
  const selected = selectCatalogue(chest, {
    maxPerEquipment: 1,
    minTrimThreshold: 0,
  });
  assert.equal(selected[0].id, "b");
});

test("skips trimming when the pool is already small", () => {
  // A narrow equipment selection shouldn't get cut down further.
  const small = Array.from({ length: 23 }, (_, i) =>
    exercise(
      `e${i}`,
      `ez bar movement ${i}`,
      i % 2 ? "back" : "upper arms",
      "ez barbell",
    ),
  );
  assert.equal(selectCatalogue(small).length, 23);
});

test("derives eating direction from current and goal weight", () => {
  assert.equal(deriveDirection(80, 74), "cut");
  assert.equal(deriveDirection(70, 78), "bulk");
  assert.equal(deriveDirection(75, 75), "maintain");
  assert.equal(deriveDirection(null, 75), "unknown");
});

test("bodyweight is always available, without duplicating it", () => {
  assert.deepEqual(withBodyweight(["ez barbell"]), [
    "ez barbell",
    "body weight",
  ]);
  assert.deepEqual(withBodyweight([]), ["body weight"]);
  assert.deepEqual(withBodyweight(["body weight"]), ["body weight"]);
});

test("excludes cardio for muscle and strength goals, keeps it otherwise", () => {
  const pool = [
    ...Array.from({ length: 15 }, (_, i) =>
      exercise(`c${i}`, `cardio ${i}`, "cardio", "body weight"),
    ),
    ...Array.from({ length: 15 }, (_, i) =>
      exercise(`b${i}`, `back ${i}`, "back", "body weight"),
    ),
  ];
  assert.equal(filterByGoal(pool, "build_muscle").length, 15);
  assert.equal(filterByGoal(pool, "get_stronger").length, 15);
  assert.equal(filterByGoal(pool, "general_fitness").length, 30);
});

test("keeps cardio rather than leaving too small a pool", () => {
  // Someone whose only equipment is cardio machines still needs a plan.
  const pool = [
    ...Array.from({ length: 12 }, (_, i) =>
      exercise(`c${i}`, `cardio ${i}`, "cardio", "stationary bike"),
    ),
    exercise("b1", "back one", "back", "stationary bike"),
  ];
  assert.equal(filterByGoal(pool, "build_muscle").length, 13);
});

test("drops exercises that were not in the catalogue we sent", () => {
  const plan = {
    days: [
      {
        day: "mon",
        exercises: [
          { exerciseId: "real", sets: 3, reps: [10, 10, 10] },
          { exerciseId: "hallucinated", sets: 3, reps: [10, 10, 10] },
        ],
      },
    ],
  };
  const { days, dropped } = validatePlan(plan, ["real"]);
  assert.equal(days[0].exercises.length, 1);
  assert.equal(dropped[0].reason, "unknown_exercise");
});

test("rejects reps arrays that don't match the set count", () => {
  const plan = {
    days: [
      {
        day: "mon",
        exercises: [{ exerciseId: "real", sets: 3, reps: [10, 10] }],
      },
    ],
  };
  const { days, dropped } = validatePlan(plan, ["real"]);
  assert.equal(days.length, 0);
  assert.equal(dropped[0].reason, "bad_reps");
});

test("rejects invalid day keys", () => {
  const plan = {
    days: [
      {
        day: "someday",
        exercises: [{ exerciseId: "real", sets: 1, reps: [10] }],
      },
    ],
  };
  const { dropped } = validatePlan(plan, ["real"]);
  assert.equal(dropped[0].reason, "bad_day");
});

test("a day left with no valid exercises is reported, not silently kept", () => {
  const plan = {
    days: [
      { day: "mon", exercises: [{ exerciseId: "nope", sets: 1, reps: [10] }] },
    ],
  };
  const { days, dropped } = validatePlan(plan, ["real"]);
  assert.equal(days.length, 0);
  assert.ok(dropped.some((d) => d.reason === "empty_day"));
});

test("rejects set counts outside 1-10", () => {
  const plan = {
    days: [
      {
        day: "mon",
        exercises: [
          { exerciseId: "real", sets: 0, reps: [] },
          { exerciseId: "real", sets: 11, reps: Array(11).fill(10) },
          { exerciseId: "real", sets: 2.5, reps: [10, 10] },
        ],
      },
    ],
  };
  const { days, dropped } = validatePlan(plan, ["real"]);
  assert.equal(days.length, 0);
  assert.equal(dropped.filter((d) => d.reason === "bad_sets").length, 3);
});

test("reports a response with no days array", () => {
  for (const plan of [null, {}, { days: "mon" }]) {
    const { days, dropped } = validatePlan(plan, ["real"]);
    assert.equal(days.length, 0);
    assert.equal(dropped[0].reason, "no_days");
  }
});

test("truncates an over-long focus label", () => {
  const plan = {
    days: [
      {
        day: "mon",
        focus: "x".repeat(200),
        exercises: [{ exerciseId: "real", sets: 1, reps: [10] }],
      },
    ],
  };
  const { days } = validatePlan(plan, ["real"]);
  assert.equal(days[0].focus.length, 80);
});
