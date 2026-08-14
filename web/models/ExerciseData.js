const { Target } = require("lucide-react");
const { Schema, models, model } = require("mongoose");

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
export const ExerciseDB =
  models.ExerciseDB || model("ExerciseDB", ExerciseSchema);
