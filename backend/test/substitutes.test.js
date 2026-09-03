import test from "node:test";
import assert from "node:assert/strict";
import { rankSubstitutes, scoreCandidate } from "../utils/substitutes.js";

const ex = (id, name, bodyPart, target, equipment, secondary = []) => ({
  id,
  name,
  bodyPart,
  target,
  equipment,
  gifUrl: "",
  secondaryMuscles: secondary,
});

const bench = ex("a1", "Barbell Bench Press", "chest", "pectorals", "barbell", [
  "triceps",
  "deltoids",
]);

test("prefers a different equipment type", () => {
  const dumbbell = ex("b1", "Dumbbell Press", "chest", "pectorals", "dumbbell");
  const barbell = ex("b2", "Barbell Incline", "chest", "pectorals", "barbell");
  assert.ok(
    scoreCandidate(dumbbell, bench, new Set()).score >
      scoreCandidate(barbell, bench, new Set()).score,
  );
});

test("familiarity breaks a tie", () => {
  const known = ex("b1", "Dumbbell Press", "chest", "pectorals", "dumbbell");
  const unknown = ex("b2", "Machine Press", "chest", "pectorals", "dumbbell");
  const ranked = rankSubstitutes(bench, [known, unknown], {
    loggedIds: new Set(["b1"]),
  });
  assert.equal(ranked[0].id, "b1");
  assert.ok(ranked[0].reasons.includes("you've done this before"));
});

test("shared secondary muscles raise the score, capped", () => {
  const many = ex("b1", "A", "chest", "pectorals", "dumbbell", [
    "triceps",
    "deltoids",
    "traps",
    "lats",
  ]);
  const none = ex("b2", "B", "chest", "pectorals", "dumbbell", []);
  const withOverlap = scoreCandidate(many, bench, new Set()).score;
  const without = scoreCandidate(none, bench, new Set()).score;
  assert.equal(withOverlap - without, 2); // only 2 actually overlap
});

test("never suggests the exercise itself", () => {
  const ranked = rankSubstitutes(bench, [bench], {});
  assert.equal(ranked.length, 0);
});

test("widens to body part when too few share the target", () => {
  const pool = [
    ex("b1", "Cable Fly", "chest", "pectorals", "cable"),
    ex("b2", "Push Up", "chest", "serratus anterior", "body weight"),
    ex("b3", "Dip", "chest", "serratus anterior", "body weight"),
  ];
  const ranked = rankSubstitutes(bench, pool, {});
  assert.equal(ranked.length, 3);
  assert.ok(ranked.some((r) => r.target === "serratus anterior"));
});

test("stays on target when there are enough matches", () => {
  const pool = [
    ex("b1", "Cable Fly", "chest", "pectorals", "cable"),
    ex("b2", "Dumbbell Fly", "chest", "pectorals", "dumbbell"),
    ex("b3", "Machine Fly", "chest", "pectorals", "leverage machine"),
    ex("b4", "Push Up", "chest", "serratus anterior", "body weight"),
  ];
  const ranked = rankSubstitutes(bench, pool, {});
  assert.equal(ranked.length, 3);
  assert.ok(ranked.every((r) => r.target === "pectorals"));
});

test("every suggestion explains itself", () => {
  const ranked = rankSubstitutes(
    bench,
    [ex("b1", "Dumbbell Press", "chest", "pectorals", "dumbbell")],
    {},
  );
  assert.ok(ranked[0].reasons.length > 0);
  assert.match(ranked[0].reasons[0], /same target muscle/);
});

test("an unknown original returns nothing rather than throwing", () => {
  assert.deepEqual(rankSubstitutes(null, [bench], {}), []);
});
