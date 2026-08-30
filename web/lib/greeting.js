// Deterministic per day so the line doesn't shuffle on every re-render, but
// still varies through the week.
const pick = (options, seed) => options[seed % options.length];

const TRAIN_WITH_FOCUS = [
  (name, focus) => `Let's go${name ? `, ${name}` : ""} — it's ${focus} day`,
  (name, focus) => `${focus} day. Time to make it count`,
  (name, focus) => `It's ${focus} day${name ? `, ${name}` : ""}. Let's work`,
];

const TRAIN_NO_FOCUS = [
  (name) => `Let's get after it${name ? `, ${name}` : ""}`,
  (name) => `Time to train${name ? `, ${name}` : ""}`,
  (name) => `Today's session is waiting${name ? `, ${name}` : ""}`,
];

const REST_TODAY = [
  (name) =>
    `Rest day${name ? `, ${name}` : ""} — recovery is where the gains land`,
  () => `Rest day. Nothing scheduled, and that's the plan`,
  (name) => `Taking it easy today${name ? `, ${name}` : ""}`,
];

// Looking back at a finished session — celebratory, past tense.
const PAST_ALL_DONE = [
  (name, label) => `${label} — done and dusted`,
  (name, label) => `You cleared the whole ${label}. Nice work`,
  (name, label) => `${label}, fully logged. That's how it's done`,
];

// Partly finished. Credit what was done rather than flagging what wasn't.
const PAST_PARTIAL = [
  (name, label, done, total) => `${label} — ${done} of ${total} logged`,
  (name, label, done, total) => `Got through ${done} of ${total} on ${label}`,
];

// Nothing logged. Deliberately neutral — no guilt-tripping about a workout
// someone already missed.
const PAST_NONE = [
  (name, label) => `${label} — nothing logged`,
  (name, label) => `${label}. No sets recorded for this one`,
];

const PAST_REST = ["A rest day", "Rest day — nothing planned"];

const DAY_INDEX = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

export const buildGreeting = ({
  displayName,
  focus,
  hasExercises,
  isToday,
  dayKey,
  completedCount = 0,
  totalCount = 0,
}) => {
  const name = (displayName || "").split(" ")[0] || "";
  const seed = DAY_INDEX[dayKey] ?? 0;

  if (!isToday) {
    if (!hasExercises) return pick(PAST_REST, seed);

    const label = focus ? `${focus} day` : "That session";

    if (completedCount === 0) return pick(PAST_NONE, seed)(name, label);
    if (completedCount >= totalCount)
      return pick(PAST_ALL_DONE, seed)(name, label);
    return pick(PAST_PARTIAL, seed)(name, label, completedCount, totalCount);
  }

  if (!hasExercises) return pick(REST_TODAY, seed)(name);
  if (focus) return pick(TRAIN_WITH_FOCUS, seed)(name, focus);
  return pick(TRAIN_NO_FOCUS, seed)(name);
};
