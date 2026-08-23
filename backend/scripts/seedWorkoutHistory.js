// Dev-only: generates realistic workout history so the progress dashboard
// has something to show. The app deliberately blocks logging future dates
// and hides exercises from dates before they were scheduled, which means
// history can't be created through the UI — by design. This writes it
// directly instead.
//
// Run from backend/ (PowerShell):
//   $env:SEED_USER_EMAIL = "you@example.com"
//   $env:SEED_WEEKS = "12"
//   node scripts/seedWorkoutHistory.js

import "dotenv/config";
import mongoose from "mongoose";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import { User } from "../models/User.js";
import { Workouts } from "../models/Workouts.js";
import { WorkoutsLog } from "../models/WorkoutsLog.js";

dayjs.extend(customParseFormat);

const DATE_FORMAT = "DD/MM/YY";
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const run = async () => {
  const email = process.env.SEED_USER_EMAIL;
  const weeks = parseInt(process.env.SEED_WEEKS || "12", 10);
  const skipRate = parseFloat(process.env.SEED_SKIP_RATE || "0.25");

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

  const workoutDoc = await Workouts.findOne({ user: user._id });
  if (!workoutDoc) {
    console.error(
      "That user has no workout schedule yet — add some exercises first.",
    );
    process.exit(1);
  }

  const today = dayjs().startOf("day");
  const startDate = today.subtract(weeks * 7 - 1, "day");

  // Backdate addedOn, otherwise effective-dating correctly hides these
  // exercises from every date before they were actually added.
  let backdated = 0;
  for (const dayKey of DAY_KEYS) {
    for (const ex of workoutDoc.schedule[dayKey] || []) {
      if (ex.removedOn) continue;
      const currentAddedOn = ex.addedOn || ex._id.getTimestamp();
      if (dayjs(currentAddedOn).isAfter(startDate, "day")) {
        ex.addedOn = startDate.toDate();
        backdated++;
      }
    }
  }
  await workoutDoc.save();

  let logDoc = await WorkoutsLog.findOne({ user: user._id });
  if (!logDoc) {
    logDoc = new WorkoutsLog({ user: user._id, exercises_done: [] });
  }

  // Drop anything already inside the seeded range so re-runs don't duplicate.
  logDoc.exercises_done = logDoc.exercises_done.filter((entry) => {
    const d = dayjs(entry.date, DATE_FORMAT, true);
    return !d.isValid() || d.isBefore(startDate, "day");
  });

  let created = 0;
  for (let i = 0; i < weeks * 7; i++) {
    const date = startDate.add(i, "day");
    if (date.isAfter(today, "day")) break;

    const dayKey = DAY_KEYS[date.day()];
    const scheduled = (workoutDoc.schedule[dayKey] || []).filter(
      (ex) => !ex.removedOn,
    );
    if (scheduled.length === 0) continue;
    if (Math.random() < skipRate) continue; // realistic gaps, so streaks vary

    // Ramp weights from 70% of target up to 100% across the window, so
    // later sessions beat earlier ones and PR detection actually fires.
    const weekIndex = Math.floor(i / 7);
    const factor = 0.7 + (0.3 * weekIndex) / Math.max(1, weeks - 1);

    const exercises = scheduled.map((ex) => {
      const sets = [];
      for (let s = 0; s < ex.numberOfSets; s++) {
        const targetReps = ex.targetReps[s] ?? 10;
        const repsCompleted =
          Math.random() < 0.2 ? Math.max(1, targetReps - 2) : targetReps;

        const set = { setNumber: s + 1, targetReps, repsCompleted };

        if (ex.usesWeight) {
          const targetWeight = ex.targetWeight[s] ?? 20;
          set.targetWeight = targetWeight;
          set.weightUsed = Math.round(targetWeight * factor * 2) / 2;
          set.weightUnit = ex.weightUnit || "kg";
        }
        sets.push(set);
      }
      return { exercise_ID: ex.exerciseId, setsCompleted: sets };
    });

    logDoc.exercises_done.push({
      date: date.format(DATE_FORMAT),
      day: dayKey,
      exercises,
    });
    created++;
  }

  await logDoc.save();

  console.log(
    `Backdated ${backdated} schedule entries to ${startDate.format(DATE_FORMAT)}.`,
  );
  console.log(`Created ${created} logged days across ${weeks} weeks.`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
