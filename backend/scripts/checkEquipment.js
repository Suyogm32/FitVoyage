// One-off diagnostic script: lists every unique `equipment` value in the
// ExerciseDB collection with a count, so we can decide which values should
// trigger the "weight" input on the Add Exercise form.
//
// Run from backend/:  node scripts/checkEquipment.js

import "dotenv/config";
import mongoose from "mongoose";
import { ExerciseDB } from "../models/ExerciseDB.js";

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const equipmentCounts = await ExerciseDB.aggregate([
    { $group: { _id: "$equipment", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  console.log(`\n${equipmentCounts.length} unique equipment values:\n`);
  for (const { _id, count } of equipmentCounts) {
    console.log(`${String(count).padStart(4)}  ${_id}`);
  }

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
