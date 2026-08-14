const { Schema, models, model, default: mongoose } = require("mongoose");

// Define a sub-schema for the exercise details
const ExerciseDetailsSchema = new Schema({
  exerciseName: { type: String, required: true },
  exerciseId: { type: String, required: true },
  exerciseGif: { type: String, required: true },
  numberOfSets: { type: Number, default: 0 },
  targetReps: { type: [Number], default: [] }, // one target per set, index 0 = set 1, etc.
});

// Define the main workout schedule schema
const WorkoutScheduleSchema = new Schema(
  {
    user: { type: mongoose.Types.ObjectId, ref: "User", required: true }, // Reference to the User model
    schedule: {
      mon: [ExerciseDetailsSchema], // Exercises for Monday
      tue: [ExerciseDetailsSchema], // Exercises for Tuesday
      wed: [ExerciseDetailsSchema], // Exercises for Wednesday
      thu: [ExerciseDetailsSchema], // Exercises for Thursday
      fri: [ExerciseDetailsSchema], // Exercises for Friday
      sat: [ExerciseDetailsSchema], // Exercises for Saturday
      sun: [ExerciseDetailsSchema], // Exercises for Sunday
    },
  },
  { timestamps: true },
); // Adds createdAt and updatedAt fields

export const Workouts =
  models.Workouts || model("Workouts", WorkoutScheduleSchema);
