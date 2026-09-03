// Ranked alternatives for one exercise. Deterministic and catalogue-driven:
// every input is structured data we already hold, so this is a query, not a
// judgement call. Same reasoning as the progression engine.

const SECONDARY_CAP = 3;
const MIN_RESULTS = 3;

export const SCORE = {
  differentEquipment: 3,
  sharedSecondary: 1,
  previouslyLogged: 2,
  sameBodyPart: 1,
};

const overlap = (a = [], b = []) => {
  const set = new Set((a || []).map((value) => String(value).toLowerCase()));
  return (b || []).filter((value) => set.has(String(value).toLowerCase()))
    .length;
};

export const scoreCandidate = (candidate, original, loggedIds) => {
  const reasons = [];
  let score = 0;

  // The point of a substitute is usually that the original's equipment is
  // unavailable, so matching equipment is worth nothing here — differing is.
  if (candidate.equipment !== original.equipment) {
    score += SCORE.differentEquipment;
    reasons.push(`uses ${candidate.equipment} instead`);
  }

  const shared = Math.min(
    SECONDARY_CAP,
    overlap(candidate.secondaryMuscles, original.secondaryMuscles),
  );
  if (shared > 0) {
    score += shared * SCORE.sharedSecondary;
    reasons.push("works the same supporting muscles");
  }

  if (loggedIds.has(candidate.id)) {
    score += SCORE.previouslyLogged;
    reasons.push("you've done this before");
  }

  if (candidate.bodyPart === original.bodyPart) {
    score += SCORE.sameBodyPart;
  }

  return { score, reasons };
};

// `pool` is already filtered to the user's available equipment by the caller,
// because that filter needs the database.
export const rankSubstitutes = (
  original,
  pool,
  { loggedIds = new Set(), limit = 5 } = {},
) => {
  if (!original) return [];

  const sameTarget = pool.filter(
    (candidate) =>
      candidate.id !== original.id && candidate.target === original.target,
  );

  // Widen to the whole body part rather than returning one option. Same
  // starvation guard as MIN_TRIM_THRESHOLD in the program catalogue — a
  // technically-correct-but-useless result is worse than a looser one.
  const widened =
    sameTarget.length >= MIN_RESULTS
      ? sameTarget
      : pool.filter(
          (candidate) =>
            candidate.id !== original.id &&
            candidate.bodyPart === original.bodyPart,
        );

  return widened
    .map((candidate) => {
      const { score, reasons } = scoreCandidate(candidate, original, loggedIds);
      return {
        id: candidate.id,
        name: candidate.name,
        gifUrl: candidate.gifUrl,
        bodyPart: candidate.bodyPart,
        target: candidate.target,
        equipment: candidate.equipment,
        score,
        // Exact target match is stated separately because it's the reason
        // this exercise is a candidate at all, not a bonus on top.
        reasons:
          candidate.target === original.target
            ? [`same target muscle (${candidate.target})`, ...reasons]
            : [`same body part (${candidate.bodyPart})`, ...reasons],
      };
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit);
};
