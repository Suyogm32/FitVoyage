import mongoose from "mongoose";
const { Schema, models, model } = mongoose;

const ExerciseSchema = new Schema({
  exercise_ID: { type: String, required: true },
  // Name/gif are snapshotted here rather than looked up from the schedule,
  // because ad-hoc entries have no schedule entry to look up. Also means a
  // logged exercise keeps its display data even if removed from the plan.
  exerciseName: { type: String, default: "" },
  exerciseGif: { type: String, default: "" },
  // True when this exercise wasn't on the schedule for that date. Recorded
  // at log time, so later schedule edits don't rewrite it.
  unplanned: { type: Boolean, default: false },
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
  exercises: [ExerciseSchema],
});

const WorkoutScheduleSchema = new Schema({
  user: { type: mongoose.Types.ObjectId, ref: "User", required: true },
  exercises_done: [ExerciseLogSchema],
});

export const WorkoutsLog = models.WorkoutsLog || model("WorkoutsLog", WorkoutScheduleSchema);