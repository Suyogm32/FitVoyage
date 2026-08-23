import { Router } from "express";
import { ExerciseDB } from "../models/ExerciseDB.js";

const router = Router();

// GET /api/exercisedb?id=...  or  ?search=...  or  /api/exercisedb  (all)
router.get("/", async (req, res) => {
  try {
    const { id, search } = req.query;

    if (id) {
      const exercise = await ExerciseDB.findOne({ id });
      return res.json(exercise);
    }

    if (search) {
      const trimmed = search.trim();
      if (!trimmed) return res.json([]);

      // Escape regex metacharacters so a search like "a+b" or "(chest)"
      // doesn't get interpreted as a regex pattern or blow up matching.
      const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");

      const exercises = await ExerciseDB.find({
        $or: [
          { name: regex },
          { target: regex },
          { equipment: regex },
          { bodyPart: regex },
        ],
      });
      return res.json(exercises);
    }

    const exercises = await ExerciseDB.find({});
    return res.json(exercises);
  } catch (error) {
    res.status(500).json({ message: "Error in fetching all exercises", error });
  }
});

// GET /api/exercisedb/bodyPart?bodyPart=...  or  distinct list of body parts
router.get("/bodyPart", async (req, res) => {
  try {
    const { bodyPart } = req.query;
    if (bodyPart) {
      const exercises = await ExerciseDB.find({ bodyPart });
      return res.json(exercises);
    }
    const bodyParts = await ExerciseDB.distinct("bodyPart");
    return res.json(bodyParts);
  } catch (error) {
    res.status(500).json({ message: "Error in fetching exercises by body part", error });
  }
});

// GET /api/exercisedb/equipment?equipment=...
router.get("/equipment", async (req, res) => {
  try {
    const { equipment } = req.query;
    if (!equipment) {
      return res.json({ message: "No such equipment found" });
    }
    const exercises = await ExerciseDB.find({ equipment }).limit(5);
    return res.json(exercises);
  } catch (error) {
    res.status(500).json({ message: "Error in fetching equipment exercises", error });
  }
});

// GET /api/exercisedb/target?target=...
router.get("/target", async (req, res) => {
  try {
    const { target } = req.query;
    if (!target) {
      return res.json({ message: "No target muscle found" });
    }
    const exercises = await ExerciseDB.find({ target }).limit(5);
    return res.json(exercises);
  } catch (error) {
    res.status(500).json({ message: "Error in fetching exercises for target muscle.", error });
  }
});

export default router;