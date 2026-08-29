import mongoose from "mongoose";
const { Schema, models, model } = mongoose;

const ExerciseSchema = new Schema({
  exercise_ID: { type: String, required: true },
  exerciseName: { type: String, default: "" },
  exerciseGif: { type: String, default: "" },
  unplanned: { type: Boolean, default: false },
  // Coach input: RPE in three buckets rather than a 1-10 scale, because a
  // ten-point picker per exercise is friction people abandon. Null for
  // anyone not in coach mode.
  feel: {
    type: String,
    enum: ["easy", "just_right", "struggled"],
    default: null,
  },
  setsCompleted: [
    {
      setNumber: { type: Number, required: true },
      targetReps: { type: Number, required: true },
      repsCompleted: { type: Number, required: true },
      targetWeight: { type: Number, default: null, min: 0 },
      weightUsed: { type: Number, default: null, min: 0 },
      weightUnit: { type: String, default: null },
    },
  ],
});

const ExerciseLogSchema = new Schema({
  date: { type: String, required: true },
  day: { type: String, required: true },
  // Session-level, one tap when the day is opened. Stands in for sleep,
  // stress and soreness combined — one signal instead of three questions.
  readiness: {
    type: String,
    enum: ["fresh", "normal", "beat_up"],
    default: null,
  },
  exercises: [ExerciseSchema],
});

const WorkoutScheduleSchema = new Schema({
  user: { type: mongoose.Types.ObjectId, ref: "User", required: true },
  exercises_done: [ExerciseLogSchema],
});

export const WorkoutsLog =
  models.WorkoutsLog || model("WorkoutsLog", WorkoutScheduleSchema);
