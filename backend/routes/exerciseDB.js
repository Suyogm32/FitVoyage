import { Router } from "express";
import { ExerciseDB } from "../models/ExerciseDB.js";

const router = Router();

// Escaping metacharacters so a search like "a+b" or "(chest)" isn't parsed
// as a pattern. Shared by the search and browse handlers.
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 48;

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

// GET /api/exercisedb/browse?search=&bodyPart=&equipment=&page=1&limit=12
// Purpose-built for the browse screen: one query, one shape, and the client
// never receives more than a page of records.
router.get("/browse", async (req, res) => {
  try {
    const { search, bodyPart, equipment } = req.query;

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number(req.query.limit) || DEFAULT_LIMIT),
    );

    const filter = {};
    if (bodyPart && bodyPart !== "all") filter.bodyPart = bodyPart;
    if (equipment && equipment !== "all") filter.equipment = equipment;

    const trimmed = (search || "").trim();
    if (trimmed) {
      const regex = new RegExp(escapeRegex(trimmed), "i");
      filter.$or = [
        { name: regex },
        { target: regex },
        { equipment: regex },
        { bodyPart: regex },
      ];
    }

    // skip/limit is only correct over a total order — sorting by name alone
    // would let two exercises with the same name swap places between
    // queries, so a record could appear on two pages or none. id breaks ties.
    const [items, total] = await Promise.all([
      ExerciseDB.find(filter)
        .sort({ name: 1, id: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      ExerciseDB.countDocuments(filter),
    ]);

    res.json({
      items,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error browsing exercises", error: error.message });
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
    res
      .status(500)
      .json({ message: "Error in fetching exercises by body part", error });
  }
});

// GET /api/exercisedb/equipment?equipment=...  or  distinct list of equipment
router.get("/equipment", async (req, res) => {
  try {
    const { equipment } = req.query;
    if (!equipment) {
      const equipmentTypes = await ExerciseDB.distinct("equipment");
      return res.json(equipmentTypes);
    }
    const exercises = await ExerciseDB.find({ equipment }).limit(5);
    return res.json(exercises);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error in fetching equipment exercises", error });
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
    res.status(500).json({
      message: "Error in fetching exercises for target muscle.",
      error,
    });
  }
});

export default router;
