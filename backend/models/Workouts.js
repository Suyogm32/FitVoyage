import mongoose from "mongoose";
const { Schema, models, model } = mongoose;

const ExerciseDetailsSchema = new Schema({
  exerciseName: { type: String, required: true },
  exerciseId: { type: String, required: true },
  exerciseGif: { type: String, required: true },
  numberOfSets: { type: Number, default: 0 },
  targetReps: { type: [Number], default: [] },
  usesWeight: { type: Boolean, default: false },
  targetWeight: { type: [Number], default: [] },
  weightUnit: { type: String, enum: ["kg", "lb"], default: "kg" },
  // Effective-dating: an entry counts as scheduled on date X only when
  // addedOn <= X < removedOn. Deletes are soft (set removedOn) so past
  // dates keep showing what was actually planned at the time. Entries
  // created before this feature have no addedOn — the ObjectId's own
  // embedded timestamp is used as the fallback (see utils/scheduleActive.js).
  addedOn: { type: Date, default: Date.now },
  removedOn: { type: Date, default: null },
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
    // Free-text label per day ("chest", "push day", "legs"). Kept parallel
    // to schedule rather than restructuring schedule[day] into an object —
    // that shape is read in half a dozen places and this is just a label.
    dayFocus: {
      mon: { type: String, default: "" },
      tue: { type: String, default: "" },
      wed: { type: String, default: "" },
      thu: { type: String, default: "" },
      fri: { type: String, default: "" },
      sat: { type: String, default: "" },
      sun: { type: String, default: "" },
    },
  },
  { timestamps: true },
);

export const Workouts =
  models.Workouts || model("Workouts", WorkoutScheduleSchema);
