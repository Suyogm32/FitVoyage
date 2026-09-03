import mongoose from "mongoose";
const { Schema, models, model } = mongoose;

const UserSchema = new Schema(
  {
    firebaseUid: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    preferredWeightUnit: { type: String, enum: ["kg", "lb"], default: "kg" },
    // Target sets per week per body part. Stored weekly and scaled to
    // whatever range the dashboard is showing, so one number covers all
    // three views. bodyPart values match ExerciseDB's own vocabulary.
    weeklyGoals: [
      {
        bodyPart: { type: String, required: true },
        targetSets: { type: Number, required: true, min: 0 },
      },
    ],
    // Inputs for program generation. Stored so the form doesn't re-ask
    // every time; each field is overridable per generation.
    // bodyWeight is a single value for now — it will go stale, and the
    // right shape long-term is a log with history. Deliberate debt: the
    // migration later is "latest log entry becomes current".
    trainingProfile: {
      goal: { type: String, default: null },
      daysPerWeek: { type: Number, min: 1, max: 7, default: null },
      experience: { type: String, default: null },
      availableEquipment: { type: [String], default: [] },
      bodyWeight: { type: Number, min: 0, default: null },
      goalWeight: { type: Number, min: 0, default: null },
    },
    // Opt-in. When false the app never asks readiness/feel questions and
    // shows no suggestions — the coach is invisible.
    coachMode: { type: Boolean, default: false },
    // Display-only opt-in, deliberately separate from coachMode. coachMode
    // changes what the app asks you; this only changes what it shows you.
    // Off by default: volume drops during a planned deload, which reads as
    // failure to anyone who doesn't already know that.
    advancedStats: { type: Boolean, default: false },
    // Deload state is stored, not derived. A deload lowers volume on purpose,
    // so the detector has to know the drop was planned — otherwise it reads
    // its own advice as fresh evidence. Same principle as effective dating:
    // you need to know *why* the data looks like this.
    deload: {
      suggestedOn: { type: Date, default: null },
      dismissedOn: { type: Date, default: null },
      acceptedOn: { type: Date, default: null },
    },
    // Fixed-window counters for rate-limited endpoints. Declared explicitly
    // rather than as a free-form Map because Mongoose's strict mode silently
    // drops $set on undeclared paths — a new limiter needs a field here.
    rateLimits: {
      programGenerate: {
        windowStart: { type: Date, default: null },
        count: { type: Number, default: 0 },
      },
    },
  },
  { timestamps: true },
);

export const User = models.User || model("User", UserSchema);
