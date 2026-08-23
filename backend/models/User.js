import mongoose from "mongoose";
const { Schema, models, model } = mongoose;

const UserSchema = new Schema(
  {
    firebaseUid: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    preferredWeightUnit: { type: String, enum: ["kg", "lb"], default: "kg" },
  },
  { timestamps: true },
);

export const User = models.User || model("User", UserSchema);