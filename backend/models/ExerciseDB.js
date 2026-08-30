import mongoose from "mongoose";
const { Schema, models, model } = mongoose;

const ExerciseSchema = new Schema({
  bodyPart: String,
  equipment: String,
  gifUrl: String,
  id: String,
  name: String,
  target: String,
  secondaryMuscles: [String],
  instructions: [String],
});

// The browse route sorts by { name, id } and pages with skip/limit. Without a
// matching index Mongo sorts the whole collection in memory for every page —
// and blows the 32MB sort limit once the catalogue grows.
ExerciseSchema.index({ name: 1, id: 1 });
ExerciseSchema.index({ bodyPart: 1, name: 1 });
// Every other route looks exercises up by this id, not by _id.
ExerciseSchema.index({ id: 1 });

export const ExerciseDB =
  models.ExerciseDB || model("ExerciseDB", ExerciseSchema);
