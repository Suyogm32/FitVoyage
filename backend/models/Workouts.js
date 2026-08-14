import mongoose from "mongoose";
const { Schema, models, model } = mongoose;

const ExerciseDetailsSchema = new Schema({
  exerciseName: { type: String, required: true },
  exerciseId: { type: String, required: true },
  exerciseGif: { type: String, required: true },
  numberOfSets: { type: Number, default: 0 },
  targetReps: { type: [Number], default: [] },
});

const WorkoutScheduleSchema = new Schema(
  {
    user: { type: mongoose.Types.ObjectId, ref: "User", required: true },
    schedule: {
      mon: [ExerciseDetailsSchema],
      tue: [ExerciseDetailsSchema],
      wed: [ExerciseDetailsSchema],
      thu: [ExerciseDetailsSchema],
      fri: [ExerciseDetailsSchema],
      sat: [ExerciseDetailsSchema],
      sun: [ExerciseDetailsSchema],
    },
  },
  { timestamps: true },
);

export const Workouts = models.Workouts || model("Workouts", WorkoutScheduleSchema);