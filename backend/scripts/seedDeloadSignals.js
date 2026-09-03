// Dev-only: bends existing logs so the deload advisory has something to fire
// on. Readiness can only be set for today through the UI, and the history
// seed ramps weights every week, so neither the readiness nor the stall
// signal is reachable without this.
//
// MUTATES LOGGED DATA. Re-run seedWorkoutHistory.js to rebuild from scratch.
//
// cmd.exe, from backend/:
//   set SEED_USER_EMAIL=you@example.com
//   node scripts/seedDeloadSignals.js

import "dotenv/config";
import mongoose from "mongoose";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import { User } from "../models/User.js";
import { WorkoutsLog } from "../models/WorkoutsLog.js";

dayjs.extend(customParseFormat);
const DATE_FORMAT = "DD/MM/YY";

const run = async () => {
  const email = process.env.SEED_USER_EMAIL;
  const beatUpCount = parseInt(process.env.SEED_BEAT_UP_SESSIONS || "3", 10);
  const stallCount = parseInt(process.env.SEED_STALL_EXERCISES || "2", 10);
  const stallDepth = parseInt(process.env.SEED_STALL_DEPTH || "5", 10);

  if (!email) {
    console.error("Set SEED_USER_EMAIL to the account you want to seed.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const user = await User.findOne({ email });
  if (!user) {
    console.error(`No user found with email ${email}.`);
    process.exit(1);
  }

  const logDoc = await WorkoutsLog.findOne({ user: user._id });
  if (!logDoc?.exercises_done?.length) {
    console.error("No workout log — run seedWorkoutHistory.js first.");
    process.exit(1);
  }

  const entries = [...logDoc.exercises_done]
    .filter((entry) => dayjs(entry.date, DATE_FORMAT, true).isValid())
    .sort(
      (a, b) =>
        dayjs(b.date, DATE_FORMAT, true).valueOf() -
        dayjs(a.date, DATE_FORMAT, true).valueOf(),
    );

  // Signal 1 — readiness. Two of the last four is the threshold.
  for (const entry of entries.slice(0, beatUpCount)) {
    entry.readiness = "beat_up";
  }

  // Signal 2 — stalls. Flatten the load across the most recent sessions of
  // the most-logged weighted exercises, so sessionsAtLoad clears 4.
  const frequency = new Map();
  for (const entry of entries) {
    for (const exercise of entry.exercises || []) {
      const hasWeight = (exercise.setsCompleted || []).some(
        (set) => set.weightUsed > 0,
      );
      if (!hasWeight) continue;
      frequency.set(
        exercise.exercise_ID,
        (frequency.get(exercise.exercise_ID) || 0) + 1,
      );
    }
  }

  const targets = [...frequency.entries()]
    .filter(([, count]) => count >= stallDepth)
    .sort((a, b) => b[1] - a[1])
    .slice(0, stallCount)
    .map(([id]) => id);

  if (targets.length < stallCount) {
    console.warn(
      `Only ${targets.length} exercise(s) have ${stallDepth}+ weighted sessions — the stall signal may not fire.`,
    );
  }

  let flattened = 0;
  for (const exerciseId of targets) {
    let seen = 0;
    let frozen = null;
    for (const entry of entries) {
      const exercise = (entry.exercises || []).find(
        (ex) => ex.exercise_ID === exerciseId,
      );
      if (!exercise) continue;
      if (seen >= stallDepth) break;

      // Freeze on the most recent session's loads, so the flat run ends at
      // the value the engine will read as "current".
      if (frozen === null) {
        frozen = (exercise.setsCompleted || []).map((set) => set.weightUsed);
      }
      exercise.setsCompleted.forEach((set, i) => {
        if (frozen[i] != null) set.weightUsed = frozen[i];
      });
      seen++;
      flattened++;
    }
  }

  logDoc.markModified("exercises_done");
  await logDoc.save();

  // Clear the cooldown, or an earlier accepted deload would suppress it.
  user.deload = { suggestedOn: null, dismissedOn: null, acceptedOn: null };
  user.coachMode = true;
  await user.save();

  console.log(
    `Set readiness "beat_up" on ${Math.min(beatUpCount, entries.length)} sessions.`,
  );
  console.log(
    `Flattened load across ${flattened} sessions of ${targets.length} exercises.`,
  );
  console.log("Cleared deload state and enabled coach mode.");
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
