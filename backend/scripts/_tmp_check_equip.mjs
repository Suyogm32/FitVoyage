import "dotenv/config";
import mongoose from "mongoose";
import { ExerciseDB } from "../models/ExerciseDB.js";

await mongoose.connect(process.env.MONGODB_URI);
const equipmentCounts = await ExerciseDB.aggregate([
  { $group: { _id: "$equipment", count: { $sum: 1 } } },
  { $sort: { count: -1 } },
]);
console.log(JSON.stringify(equipmentCounts, null, 2));
await mongoose.disconnect();
