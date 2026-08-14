import mongoose from "mongoose";
const { Schema, models, model } = mongoose;

const ExerciseSchema = new Schema({
  exercise_ID: { type: String, required: true },
  setsCompleted: [
    {
      setNumber: { type: Number, required: true },
      targetReps: { type: Number, required: true },
      repsCompleted: { type: Number, required: true },
    },
  ],
});

const ExerciseLogSchema = new Schema({
  date: { type: String, required: true },
  day: { type: String, required: true },
  exercises: [ExerciseSchema],
});

const WorkoutScheduleSchema = new Schema({
  user: { type: mongoose.Types.ObjectId, ref: "User", required: true },
  exercises_done: [ExerciseLogSchema],
});

export const WorkoutsLog = models.WorkoutsLog || model("WorkoutsLog", WorkoutScheduleSchema);