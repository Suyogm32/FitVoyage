import mongoose from "mongoose";
const { Schema, models, model } = mongoose;

const BodyWeightSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // A real Date normalised to UTC midnight, not the "DD/MM/YY" string
    // ExerciseLog uses. Those strings can't be range-queried or sorted —
    // "01/09/26" sorts before "30/08/26" lexically. This collection is new,
    // so it doesn't inherit that.
    date: { type: Date, required: true },
    // ALWAYS kilograms. Converted once on write, so the series is directly
    // comparable even if the user switches their preferred unit later.
    // Display conversion happens on read.
    weight: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

// Also serves descending reads — Mongo walks an index in either direction.
BodyWeightSchema.index({ user: 1, date: 1 }, { unique: true });

export const BodyWeight =
  models.BodyWeight || model("BodyWeight", BodyWeightSchema);
