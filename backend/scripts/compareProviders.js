// Dev tool: runs program generation through every configured provider on a
// real user's profile and prints the results for comparison.
//
//   $env:COMPARE_USER_EMAIL = "you@example.com"
//   node scripts/compareProviders.js

import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import { ExerciseDB } from "../models/ExerciseDB.js";
import { generateProgram } from "../utils/programGenerator.js";
import { listProviders } from "../utils/llm/index.js";
import {
  selectCatalogue,
  withBodyweight,
  filterByGoal,
} from "../utils/programCatalogue.js";

const run = async () => {
  const email = process.env.COMPARE_USER_EMAIL;
  const scope = process.env.COMPARE_SCOPE || "week";

  if (!email) {
    console.error(
      "Set COMPARE_USER_EMAIL to the account whose profile to use.",
    );
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const user = await User.findOne({ email })
    .select("trainingProfile preferredWeightUnit")
    .lean();
  if (!user) {
    console.error(`No user found with email ${email}.`);
    process.exit(1);
  }

  const equipment = withBodyweight(user.trainingProfile?.availableEquipment);

  const matching = await ExerciseDB.find({ equipment: { $in: equipment } })
    .select("id name bodyPart target equipment")
    .lean();

  const catalogue = selectCatalogue(
    filterByGoal(matching, user.trainingProfile?.goal),
  );

  console.log(`\nProfile: ${JSON.stringify(user.trainingProfile)}`);
  console.log(
    `Equipment matches ${matching.length} exercises, trimmed to ${catalogue.length}.`,
  );

  const providers = listProviders();
  if (providers.length === 0) {
    console.error("No providers configured — check your API keys in .env.");
    process.exit(1);
  }
  console.log(`Configured providers: ${providers.join(", ")}\n`);

  for (const provider of providers) {
    const startedAt = Date.now();
    const result = await generateProgram({
      trainingProfile: user.trainingProfile,
      catalogue,
      scope,
      targetDay: scope === "day" ? "mon" : null,
      weightUnit: user.preferredWeightUnit || "kg",
      provider,
    });
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);

    console.log("=".repeat(60));
    console.log(
      `${provider}  —  ${elapsed}s  —  ${result.ok ? "ok" : `failed (${result.reason})`}`,
    );
    console.log("=".repeat(60));

    const nameById = new Map(catalogue.map((e) => [e.id, e.name]));
    for (const day of result.days) {
      console.log(`\n${day.day.toUpperCase()}  ${day.focus}`);
      for (const exercise of day.exercises) {
        const name = nameById.get(exercise.exerciseId) || exercise.exerciseId;
        console.log(
          `  ${name} — ${exercise.sets} sets, reps ${exercise.reps.join("/")}`,
        );
      }
    }

    if (result.dropped.length) {
      console.log(`\n  dropped: ${JSON.stringify(result.dropped)}`);
    }
    console.log("");
  }

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error("Comparison failed:", err);
  process.exit(1);
});
