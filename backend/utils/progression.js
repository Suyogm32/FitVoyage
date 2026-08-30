// Progressive overload engine.
//
// Rules are data, not code: the evaluator computes facts about an
// exercise's recent history, then walks a rule list in priority order and
// takes the first match. Adding a rule means adding an object — no
// evaluator changes. Later, user-configurable rules just means loading a
// different array (e.g. per-user presets) and passing it in.
//
// Deliberately does NOT use estimated 1RM: Epley drifts badly above ~10
// reps, and progressing off an estimate means deciding from a guess
// derived from a guess. Only direct observations feed this.

export const DEFAULT_RULES = [
  {
    id: "deload-after-repeated-misses",
    priority: 10,
    when: { consecutiveMisses: { gte: 2 } },
    then: { action: "deload", loadDeltaPct: -10, repDelta: 0 },
    explain:
      "Missed your targets two sessions running — backing off to rebuild.",
  },
  {
    id: "hold-after-miss",
    priority: 20,
    when: { hitAllTargets: { eq: false } },
    then: { action: "hold", loadDeltaPct: 0, repDelta: 0 },
    explain: "Didn't hit every target last time — repeat this weight.",
  },
  {
    id: "hold-when-struggled",
    priority: 30,
    when: { hitAllTargets: { eq: true }, feel: { eq: "struggled" } },
    then: { action: "hold", loadDeltaPct: 0, repDelta: 0 },
    explain: "You hit your targets but it was a grind — consolidate here.",
  },
  {
    id: "hold-when-beat-up",
    priority: 35,
    when: { hitAllTargets: { eq: true }, readiness: { eq: "beat_up" } },
    then: { action: "hold", loadDeltaPct: 0, repDelta: 0 },
    explain: "You're not feeling recovered today — hold rather than push.",
  },
  {
    id: "increase-when-easy",
    priority: 40,
    when: { hitAllTargets: { eq: true }, feel: { eq: "easy" } },
    then: { action: "increase", loadDeltaPct: 5, repDelta: 5 },
    explain: "Cleared every target and it felt easy — time to add load.",
  },
  {
    id: "increase-standard",
    priority: 50,
    when: { hitAllTargets: { eq: true } },
    then: { action: "increase", loadDeltaPct: 2.5, repDelta: 5 },
    explain: "Hit all your targets — small step up.",
  },
];

// Tiny predicate vocabulary. Keep it small — every operator added here is
// one more thing a future rule editor would have to expose.
const OPERATORS = {
  eq: (actual, expected) => actual === expected,
  neq: (actual, expected) => actual !== expected,
  in: (actual, expected) =>
    Array.isArray(expected) && expected.includes(actual),
  gte: (actual, expected) => typeof actual === "number" && actual >= expected,
  lte: (actual, expected) => typeof actual === "number" && actual <= expected,
};

const matchesRule = (facts, when) =>
  Object.entries(when).every(([factName, condition]) =>
    Object.entries(condition).every(([operator, expected]) => {
      const compare = OPERATORS[operator];
      return compare ? compare(facts[factName], expected) : false;
    }),
  );

export const evaluateRules = (facts, rules = DEFAULT_RULES) =>
  [...rules]
    .sort((a, b) => a.priority - b.priority)
    .find((rule) => matchesRule(facts, rule.when)) || null;

// Load increments people actually use — 2.5 kg plates on bigger lifts,
// smaller jumps on lighter accessory work.
const incrementFor = (weight) => (weight >= 20 ? 2.5 : 1.25);

const applyLoadDelta = (weight, pct) => {
  if (!weight) return weight;
  // "Hold" must mean exactly the same weight. Rounding a zero delta onto
  // the grid would silently shift it, which contradicts the advice.
  if (pct === 0) return weight;

  const step = incrementFor(weight);
  let next = Math.round((weight * (1 + pct / 100)) / step) * step;

  // A change that rounds back onto (or past) the current weight reads as a
  // bug. Step to the neighbouring grid multiple rather than weight ± step,
  // so the result stays on the grid even when the starting weight isn't.
  if (pct > 0 && next <= weight) next = Math.floor(weight / step) * step + step;
  if (pct < 0 && next >= weight)
    next = Math.max(step, Math.ceil(weight / step) * step - step);

  return next;
};

// The common pyramid: heavier weight, fewer reps, each set up.
const isAscendingLadder = (weights) => {
  if (weights.length < 2) return false;
  if (weights.some((weight) => weight == null || weight <= 0)) return false;
  return weights.every((weight, i) => i === 0 || weight > weights[i - 1]);
};

// Progress a pyramid by shifting every rung up one: each set takes the
// weight of the set above it, all of which the lifter already handled last
// session. Only the top set is a genuinely new load, so it advances by a
// single increment rather than inheriting anything.
//
//   30 / 35 / 40   ->   35 / 40 / 42.5
//
// This self-calibrates to whatever spacing the lifter already uses, which
// a flat percentage can't do.
const shiftLadder = (weights) => {
  const top = weights[weights.length - 1];
  return [...weights.slice(1), top + incrementFor(top)];
};

const hitAllTargets = (session) => {
  const sets = session.setsCompleted || [];
  return (
    sets.length > 0 && sets.every((set) => set.repsCompleted >= set.targetReps)
  );
};

// sessions: newest first, each { date, feel, setsCompleted }
export const analyseHistory = (sessions, todayReadiness) => {
  if (!sessions.length) return null;
  const last = sessions[0];
  const sets = last.setsCompleted || [];

  let consecutiveMisses = 0;
  for (const session of sessions) {
    if (hitAllTargets(session)) break;
    consecutiveMisses++;
  }

  let consecutiveHits = 0;
  for (const session of sessions) {
    if (!hitAllTargets(session)) break;
    consecutiveHits++;
  }

  return {
    hitAllTargets: hitAllTargets(last),
    // No feel recorded (basic mode, or older logs) reads as neutral rather
    // than blocking the rules that depend on it.
    feel: last.feel || "just_right",
    readiness: todayReadiness || "normal",
    consecutiveMisses,
    consecutiveHits,
    sessionsLogged: sessions.length,
    lastDate: last.date,
    lastWeights: sets.map((set) => set.weightUsed ?? null),
    lastReps: sets.map((set) => set.repsCompleted),
    lastTargets: sets.map((set) => set.targetReps),
    usesWeight: sets.some(
      (set) => set.weightUsed != null && set.weightUsed > 0,
    ),
  };
};

export const buildSuggestion = ({
  sessions,
  todayReadiness,
  rules = DEFAULT_RULES,
}) => {
  const facts = analyseHistory(sessions, todayReadiness);
  if (!facts) {
    return {
      action: "none",
      reason: "no_history",
      explain: "Log this exercise once to start getting suggestions.",
    };
  }

  const rule = evaluateRules(facts, rules);
  if (!rule) {
    return {
      action: "hold",
      ruleId: null,
      explain: "No matching rule — repeating last session.",
      facts,
    };
  }

  const useLadder =
    facts.usesWeight &&
    rule.then.action === "increase" &&
    isAscendingLadder(facts.lastWeights);

  // Weighted lifts progress by load; bodyweight work progresses by reps,
  // since there's no load to add.
  let suggestedWeights;
  if (!facts.usesWeight) {
    suggestedWeights = facts.lastWeights.map(() => null);
  } else if (useLadder) {
    suggestedWeights = shiftLadder(facts.lastWeights);
  } else {
    suggestedWeights = facts.lastWeights.map((weight) =>
      applyLoadDelta(weight, rule.then.loadDeltaPct),
    );
  }

  const suggestedReps = facts.usesWeight
    ? facts.lastTargets.map((target, i) => target ?? facts.lastReps[i])
    : facts.lastReps.map((reps) =>
        Math.max(1, reps + (rule.then.repDelta || 0)),
      );

  return {
    action: rule.then.action,
    ruleId: rule.id,
    method: useLadder ? "ladder_shift" : "percentage",
    explain: rule.explain,
    suggestedWeights,
    suggestedReps,
    usesWeight: facts.usesWeight,
    basedOn: {
      date: facts.lastDate,
      sessionsLogged: facts.sessionsLogged,
      consecutiveMisses: facts.consecutiveMisses,
      consecutiveHits: facts.consecutiveHits,
      feel: facts.feel,
    },
  };
};
