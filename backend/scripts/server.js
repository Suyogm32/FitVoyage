import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../models/User.js";

async function removeScheduleFromUsers() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("Missing MONGODB_URI env var");
    }
    await mongoose.connect(process.env.MONGODB_URI);

    const result = await User.updateMany({}, { $unset: { schedule: "" } });
    console.log(`Successfully updated ${result.modifiedCount} users`);

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error removing schedule field:", error);
  }
}

// removeScheduleFromUsers();