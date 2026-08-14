const { Schema, models, model, default: mongoose } = require("mongoose");

const ExerciseSchema = new Schema({
  exercise_ID: { type: String, required: true }, // matches ExerciseDB's string `id`, not a Mongo ObjectId
  setsCompleted: [
    {
      setNumber: { type: Number, required: true },
      targetReps: { type: Number, required: true }, // snapshot of the target at log time
      repsCompleted: { type: Number, required: true }, // 0 = skipped
    },
  ],
});

const ExerciseLogSchema = new Schema({
  date: { type: String, required: true }, // Format: "24/12/24"
  day: { type: String, required: true }, // Example: "Monday"
  exercises: [ExerciseSchema], // Array of exercises
});

const WorkoutScheduleSchema = new Schema({
  user: { type: mongoose.Types.ObjectId, ref: "User", required: true },
  exercises_done: [ExerciseLogSchema], // Array of exercise logs
});

export const WorkoutsLog =
  models.WorkoutsLog || model("WorkoutsLog", WorkoutScheduleSchema);
