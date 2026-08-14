const mongoose = require("mongoose");
const { User } = require("./User");

async function removeScheduleFromUsers() {
  try {
    // after
    if (!process.env.MONGODB_URI) {
      throw new Error("Missing MONGODB_URI env var");
    }
    await mongoose.connect(process.env.MONGODB_URI);

    // Remove `schedule` from all users
    const result = await User.updateMany({}, { $unset: { schedule: "" } });
    console.log(`Successfully updated ${result.modifiedCount} users`);

    // Disconnect from the database
    await mongoose.disconnect();
  } catch (error) {
    console.error("Error removing schedule field:", error);
  }
}

//removeScheduleFromUsers();
