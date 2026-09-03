// Dev-only: generates a realistic body-weight history so the progress chart
// and the 7-day trend have something to show. Entries can only be logged one
// per day through the UI, so a useful series would take months to build by
// hand — this writes it directly instead.
//
// Weights are in KILOGRAMS regardless of your display preference, because
// that's what the collection stores.
//
// Run from backend/ (PowerShell):
//   $env:SEED_USER_EMAIL = "you@example.com"
//   $env:SEED_WEEKS = "16"
//   node scripts/seedBodyWeight.js
//
// cmd.exe:
//   set SEED_USER_EMAIL=you@example.com
//   node scripts/seedBodyWeight.js

import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import { BodyWeight } from "../models/BodyWeight.js";
import { parseDayInput, MIN_KG, MAX_KG } from "../utils/bodyWeight.js";

const DAY_MS = 24 * 60 * 60 * 1000;

// Sum of three uniforms — a cheap bell curve. Real daily readings cluster
// around the trend rather than scattering evenly across the range.
const noise = (spread) =>
  ((Math.random() + Math.random() + Math.random()) / 3 - 0.5) * 2 * spread;

const run = async () => {
  const email = process.env.SEED_USER_EMAIL;
  const weeks = parseInt(process.env.SEED_WEEKS || "16", 10);
  const logRate = parseFloat(process.env.SEED_LOG_RATE || "0.6");
  const spread = parseFloat(process.env.SEED_NOISE_KG || "0.55");

  if (!email) {
    console.error("Set SEED_USER_EMAIL to the account you want to seed.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const user = await User.findOne({ email }).lean();
  if (!user) {
    console.error(`No user found with email ${email}.`);
    process.exit(1);
  }

  const goalWeight = Number(user.trainingProfile?.goalWeight) || null;
  const legacyWeight = Number(user.trainingProfile?.bodyWeight) || null;

  const startWeight =
    parseFloat(process.env.SEED_START_WEIGHT) || legacyWeight || 82;

  // Drift toward the goal without quite reaching it — a chart that lands
  // exactly on target looks fake, and leaves nothing for the goal line to
  // show. Falls back to a mild cut when no goal is set.
  const defaultEnd = goalWeight
    ? startWeight + (goalWeight - startWeight) * 0.7
    : startWeight - 3;
  const endWeight = parseFloat(process.env.SEED_END_WEIGHT) || defaultEnd;

  for (const [label, value] of [
    ["start", startWeight],
    ["end", endWeight],
  ]) {
    if (!Number.isFinite(value) || value < MIN_KG || value > MAX_KG) {
      console.error(
        `${label} weight ${value} is outside ${MIN_KG}-${MAX_KG} kg.`,
      );
      process.exit(1);
    }
  }

  const days = weeks * 7;
  const today = parseDayInput(new Date());
  const startDate = new Date(today.getTime() - (days - 1) * DAY_MS);

  // Clear the seeded window so re-running doesn't collide with the unique
  // { user, date } index or leave a mix of two runs.
  const removed = await BodyWeight.deleteMany({
    user: user._id,
    date: { $gte: startDate, $lte: today },
  });

  const entries = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate.getTime() + i * DAY_MS);

    // People don't weigh themselves every day, and gaps are what make the
    // "not enough history" branch of the trend reachable in testing.
    if (Math.random() > logRate) continue;

    const progress = days === 1 ? 1 : i / (days - 1);
    const trend = startWeight + (endWeight - startWeight) * progress;

    // Saturdays and Sundays read heavier — food and water, not fat. This is
    // exactly the artefact the two-week-average trend exists to ignore.
    const dayOfWeek = date.getUTCDay();
    const weekend = dayOfWeek === 0 || dayOfWeek === 6 ? 0.35 : 0;

    const weight = Math.round((trend + weekend + noise(spread)) * 10) / 10;

    entries.push({ user: user._id, date, weight });
  }

  if (entries.length === 0) {
    console.error("Generated nothing — is SEED_LOG_RATE too low?");
    process.exit(1);
  }

  await BodyWeight.insertMany(entries);

  const first = entries[0];
  const last = entries[entries.length - 1];

  console.log(`Removed ${removed.deletedCount} existing entries in range.`);
  console.log(
    `Created ${entries.length} entries across ${weeks} weeks ` +
      `(${Math.round((entries.length / days) * 100)}% of days).`,
  );
  console.log(
    `${first.weight} kg on ${first.date.toISOString().slice(0, 10)} → ` +
      `${last.weight} kg on ${last.date.toISOString().slice(0, 10)}` +
      (goalWeight ? `, goal ${goalWeight} kg` : ""),
  );

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
