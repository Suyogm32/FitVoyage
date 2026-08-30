// Catalogue preparation and plan validation for program generation.
//
// The model may only choose exercises we hand it, so this module owns both
// ends of that contract: trimming the catalogue down to a sane prompt, and
// checking the returned plan against exactly that set.

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// Available to everyone regardless of what they ticked — you always have
// your own bodyweight.
export const ALWAYS_AVAILABLE_EQUIPMENT = ["body weight"];

export const withBodyweight = (equipment = []) => [
  ...new Set([...equipment, ...ALWAYS_AVAILABLE_EQUIPMENT]),
];

// Cardio movements are noise in a hypertrophy or strength program.
const STRENGTH_GOALS = ["build_muscle", "get_stronger"];
const EXCLUDED_BODY_PARTS = ["cardio"];
const MIN_AFTER_GOAL_FILTER = 10;

export const filterByGoal = (exercises, goal) => {
  if (!STRENGTH_GOALS.includes(goal)) return [...exercises];

  const filtered = exercises.filter(
    (exercise) => !EXCLUDED_BODY_PARTS.includes(exercise.bodyPart),
  );

  // Never filter someone down to nothing — if their only equipment is a
  // stationary bike, a cardio-heavy plan beats no plan at all.
  return filtered.length >= MIN_AFTER_GOAL_FILTER ? filtered : [...exercises];
};

const MAX_PER_BODY_PART = 25;
const MAX_PER_EQUIPMENT = 5;

// Below this, there's nothing for the caps to protect against — trimming a
// narrow equipment selection just starves the generator.
const MIN_TRIM_THRESHOLD = 60;

// Shorter names correlate with staple movements in this catalogue
// ("Barbell Bench Press" vs "Barbell Bench Press With Chains On Smith
// Machine"), so name length is a cheap, deterministic proxy for "standard".
const byNameLength = (a, b) => a.name.length - b.name.length;

// Caps per body part, and per equipment within each body part so one
// equipment type can't crowd out the rest for a full-gym user.
export const selectCatalogue = (
  exercises,
  {
    maxPerBodyPart = MAX_PER_BODY_PART,
    maxPerEquipment = MAX_PER_EQUIPMENT,
    minTrimThreshold = MIN_TRIM_THRESHOLD,
  } = {},
) => {
  if (exercises.length <= minTrimThreshold) return [...exercises];

  const byBodyPart = new Map();
  for (const exercise of exercises) {
    const key = exercise.bodyPart || "other";
    if (!byBodyPart.has(key)) byBodyPart.set(key, []);
    byBodyPart.get(key).push(exercise);
  }

  const selected = [];
  for (const [, group] of byBodyPart) {
    const byEquipment = new Map();
    for (const exercise of group) {
      const key = exercise.equipment || "other";
      if (!byEquipment.has(key)) byEquipment.set(key, []);
      byEquipment.get(key).push(exercise);
    }

    const forBodyPart = [];
    for (const [, equipmentGroup] of byEquipment) {
      forBodyPart.push(
        ...[...equipmentGroup].sort(byNameLength).slice(0, maxPerEquipment),
      );
    }

    selected.push(...forBodyPart.sort(byNameLength).slice(0, maxPerBodyPart));
  }

  return selected;
};

// Whether the athlete is eating below, above or around maintenance. Stated
// explicitly so the model isn't left inferring intent from two numbers.
export const deriveDirection = (bodyWeight, goalWeight) => {
  if (!bodyWeight || !goalWeight) return "unknown";
  if (goalWeight < bodyWeight - 1) return "cut";
  if (goalWeight > bodyWeight + 1) return "bulk";
  return "maintain";
};

export const buildProgramPayload = ({
  trainingProfile = {},
  catalogue,
  scope = "week",
  targetDay = null,
  focus = null,
  weightUnit = "kg",
}) => ({
  scope,
  targetDay,
  focus,
  profile: {
    goal: trainingProfile.goal || "general_fitness",
    experience: trainingProfile.experience || "beginner",
    daysPerWeek: trainingProfile.daysPerWeek || 3,
    bodyWeight: trainingProfile.bodyWeight ?? null,
    goalWeight: trainingProfile.goalWeight ?? null,
    weightUnit,
    direction: deriveDirection(
      trainingProfile.bodyWeight,
      trainingProfile.goalWeight,
    ),
  },
  catalogue: catalogue.map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
    bodyPart: exercise.bodyPart,
    target: exercise.target,
    equipment: exercise.equipment,
  })),
});

// Checks a model-produced plan against the exact ids we sent. Anything
// unrecognised or malformed is dropped rather than trusted — same principle
// as clamping: never let model output through unvalidated.
export const validatePlan = (plan, allowedIds) => {
  const allowed = allowedIds instanceof Set ? allowedIds : new Set(allowedIds);
  const dropped = [];

  if (!plan || !Array.isArray(plan.days)) {
    return { days: [], dropped: [{ reason: "no_days" }] };
  }

  const days = [];
  for (const day of plan.days) {
    if (!DAY_KEYS.includes(day?.day)) {
      dropped.push({ reason: "bad_day", value: day?.day });
      continue;
    }

    const exercises = [];
    for (const exercise of day.exercises || []) {
      if (!allowed.has(exercise?.exerciseId)) {
        dropped.push({
          reason: "unknown_exercise",
          value: exercise?.exerciseId,
        });
        continue;
      }

      const sets = Number(exercise.sets);
      if (!Number.isInteger(sets) || sets < 1 || sets > 10) {
        dropped.push({ reason: "bad_sets", value: exercise.exerciseId });
        continue;
      }

      const reps = Array.isArray(exercise.reps)
        ? exercise.reps.map(Number)
        : [];
      if (
        reps.length !== sets ||
        reps.some((r) => !Number.isInteger(r) || r < 1 || r > 100)
      ) {
        dropped.push({ reason: "bad_reps", value: exercise.exerciseId });
        continue;
      }

      exercises.push({ exerciseId: exercise.exerciseId, sets, reps });
    }

    // A day the model filled entirely with invalid ids is not a rest day —
    // dropping it silently would misrepresent the plan.
    if (exercises.length === 0) {
      dropped.push({ reason: "empty_day", value: day.day });
      continue;
    }

    days.push({
      day: day.day,
      focus: typeof day.focus === "string" ? day.focus.slice(0, 80) : "",
      exercises,
    });
  }

  return { days, dropped };
};
