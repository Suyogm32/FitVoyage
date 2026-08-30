import test from "node:test";
import assert from "node:assert/strict";
import { parseResponse, generateProgram } from "../utils/programGenerator.js";

const catalogue = [
  {
    id: "a1",
    name: "Bench Press",
    bodyPart: "chest",
    equipment: "barbell",
    target: "pectorals",
  },
  {
    id: "b2",
    name: "Barbell Row",
    bodyPart: "back",
    equipment: "barbell",
    target: "lats",
  },
];

const profile = {
  goal: "build_muscle",
  experience: "intermediate",
  daysPerWeek: 1,
};

const planText = (...exercises) =>
  JSON.stringify({
    days: [{ day: "mon", focus: "chest", exercises }],
  });

const ok = (id) => ({ exerciseId: id, sets: 3, reps: [12, 10, 8] });

// A provider is anything with a name and complete() — so tests use stand-ins
// and never touch the network or need an API key.
const returns = (name, text) => ({ name, complete: async () => text });
const throws = (name, message) => ({
  name,
  complete: async () => {
    throw new Error(message);
  },
});

const run = (chain) =>
  generateProgram({ trainingProfile: profile, catalogue, chain });

/* parseResponse */

test("parses a plain JSON response", () => {
  assert.deepEqual(parseResponse('{"days":[]}'), { days: [] });
});

test("strips a ```json fence", () => {
  assert.deepEqual(parseResponse('```json\n{"days":[]}\n```'), { days: [] });
});

test("strips a bare ``` fence", () => {
  assert.deepEqual(parseResponse('```\n{"days":[]}\n```'), { days: [] });
});

test("tolerates surrounding whitespace", () => {
  assert.deepEqual(parseResponse('\n\n  {"days":[]}  \n'), { days: [] });
});

test("throws on a response that isn't JSON", () => {
  assert.throws(() => parseResponse("I'm sorry, I can't help with that."));
});

/* generateProgram — provider chain */

test("reports no_provider when nothing is configured", async () => {
  const result = await run([]);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "no_provider");
  assert.deepEqual(result.days, []);
});

test("returns the first provider's plan and names it", async () => {
  const result = await run([returns("gemini", planText(ok("a1")))]);
  assert.equal(result.ok, true);
  assert.equal(result.provider, "gemini");
  assert.equal(result.days.length, 1);
  assert.equal(result.days[0].exercises[0].exerciseId, "a1");
  assert.deepEqual(result.attempts, []);
});

test("falls through to the next provider when one throws", async () => {
  const result = await run([
    throws("gemini", "429 rate limited"),
    returns("openrouter", planText(ok("a1"))),
  ]);
  assert.equal(result.ok, true);
  assert.equal(result.provider, "openrouter");
  assert.equal(result.attempts.length, 1);
  assert.equal(result.attempts[0].provider, "gemini");
  assert.match(result.attempts[0].error, /429/);
});

test("falls through when a provider returns unparseable text", async () => {
  const result = await run([
    returns("gemini", "Sure! Here's your program:"),
    returns("openrouter", planText(ok("a1"))),
  ]);
  assert.equal(result.ok, true);
  assert.equal(result.provider, "openrouter");
  assert.equal(result.attempts.length, 1);
});

// The important one: valid JSON is not the same as a usable plan.
test("falls through when every exercise is a hallucinated id", async () => {
  const result = await run([
    returns("gemini", planText(ok("not-in-catalogue"))),
    returns("anthropic", planText(ok("b2"))),
  ]);
  assert.equal(result.ok, true);
  assert.equal(result.provider, "anthropic");
  assert.equal(result.attempts[0].error, "empty_plan");
});

test("reports all_providers_failed with one attempt per provider", async () => {
  const result = await run([
    throws("gemini", "timeout"),
    throws("openrouter", "502"),
    throws("anthropic", "401"),
  ]);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "all_providers_failed");
  assert.equal(result.attempts.length, 3);
  assert.deepEqual(
    result.attempts.map((a) => a.provider),
    ["gemini", "openrouter", "anthropic"],
  );
});

test("keeps valid exercises and reports the dropped ones", async () => {
  const result = await run([
    returns("gemini", planText(ok("a1"), ok("ghost"), ok("b2"))),
  ]);
  assert.equal(result.ok, true);
  assert.equal(result.days[0].exercises.length, 2);
  assert.equal(result.dropped.length, 1);
  assert.equal(result.dropped[0].reason, "unknown_exercise");
  assert.equal(result.dropped[0].value, "ghost");
});

test("stops at the first provider that works", async () => {
  let secondCalled = false;
  const result = await run([
    returns("gemini", planText(ok("a1"))),
    {
      name: "openrouter",
      complete: async () => {
        secondCalled = true;
        return planText(ok("b2"));
      },
    },
  ]);
  assert.equal(result.provider, "gemini");
  assert.equal(secondCalled, false);
});
