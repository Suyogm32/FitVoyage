import dayjs from "dayjs";

// A deload is a planned, temporary reduction to let accumulated fatigue
// clear. Detecting one needs signals no single exercise can see, so this sits
// above the rule engine rather than inside it.
//
// Three signals, and at least two must fire. One signal alone is noise:
// a bad night's sleep isn't systemic fatigue, and one stalled lift is a
// problem with that lift.

export const THRESHOLDS = {
  beatUpSessions: 2, // of the last 4
  readinessWindow: 4,
  stalledExercises: 2,
  volumeRampWeeks: 3, // consecutive weekly increases
  minSessions: 4,
  minCompletedWeeks: 4,
  cooldownWeeks: 3,
};

export const countBeatUp = (
  sessions = [],
  window = THRESHOLDS.readinessWindow,
) => sessions.slice(0, window).filter((s) => s.readiness === "beat_up").length;

// Consecutive week-on-week increases, counted backwards from the most recent
// COMPLETED week. The current week is excluded by the caller — comparing a
// week that's two days old against a finished one would report a "drop" every
// Monday and a "climb" every Sunday.
export const volumeRampWeeks = (weeks = []) => {
  let run = 0;
  for (let i = weeks.length - 1; i > 0; i--) {
    const current = weeks[i]?.volumeKg || 0;
    const previous = weeks[i - 1]?.volumeKg || 0;
    if (current > previous && current > 0) run++;
    else break;
  }
  return run;
};

export const assessDeload = ({
  sessions = [], // newest first, each { date, readiness }
  stalledCount = 0,
  weeks = [], // oldest → newest, each { weekStart, volumeKg }, current week last
  lastDeloadAt = null,
  now = new Date(),
} = {}) => {
  // Drop the in-progress week before looking at the trend.
  const completed = weeks.slice(0, -1);

  const beatUp = countBeatUp(sessions);
  const ramp = volumeRampWeeks(completed);

  const signals = [
    {
      id: "readiness",
      met: beatUp >= THRESHOLDS.beatUpSessions,
      detail: `You started ${beatUp} of your last ${Math.min(
        sessions.length,
        THRESHOLDS.readinessWindow,
      )} sessions feeling beat up.`,
    },
    {
      id: "stalls",
      met: stalledCount >= THRESHOLDS.stalledExercises,
      detail:
        stalledCount === 1
          ? "1 exercise is stuck at the same load."
          : `${stalledCount} exercises are stuck at the same load.`,
    },
    {
      id: "volume",
      met: ramp >= THRESHOLDS.volumeRampWeeks,
      detail:
        ramp > 0
          ? `Your training volume has climbed ${ramp} weeks running.`
          : "Your training volume isn't trending up.",
    },
  ];

  const metCount = signals.filter((signal) => signal.met).length;

  // Not enough history is a different answer from "you're fine". Saying
  // nothing is correct here; claiming recovery isn't.
  const enoughData =
    sessions.length >= THRESHOLDS.minSessions &&
    completed.length >= THRESHOLDS.minCompletedWeeks;

  // A deload reduces volume by design, so without this the drop it causes
  // would look like a new signal and it would recommend another one.
  const recentlyDeloaded = lastDeloadAt
    ? dayjs(now).diff(dayjs(lastDeloadAt), "week") < THRESHOLDS.cooldownWeeks
    : false;

  return {
    recommended: enoughData && !recentlyDeloaded && metCount >= 2,
    metCount,
    signals,
    enoughData,
    recentlyDeloaded,
  };
};
