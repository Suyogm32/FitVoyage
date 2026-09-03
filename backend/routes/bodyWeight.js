import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { BodyWeight } from "../models/BodyWeight.js";
import { User } from "../models/User.js";
import {
  parseDayInput,
  startOfUtcToday,
  normaliseWeight,
  summariseTrend,
  fromKg,
  round1,
  MIN_KG,
  MAX_KG,
} from "../utils/bodyWeight.js";

const router = Router();

const DEFAULT_RANGE_DAYS = 180;

// GET /api/bodyweight?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/", requireAuth, async (req, res) => {
  try {
    const to = parseDayInput(req.query.to) || startOfUtcToday();
    const from =
      parseDayInput(req.query.from) ||
      new Date(to.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000);

    const [entries, user] = await Promise.all([
      BodyWeight.find({ user: req.user.dbId, date: { $gte: from, $lte: to } })
        .sort({ date: 1 })
        .lean(),
      User.findById(req.user.dbId)
        .select("preferredWeightUnit trainingProfile.goalWeight")
        .lean(),
    ]);

    const unit = user?.preferredWeightUnit || "kg";
    const trend = summariseTrend(entries);
    const goalKg = Number(user?.trainingProfile?.goalWeight) || null;

    // Stored in kg, displayed in whatever the user prefers. Converting here
    // rather than in the client keeps one definition of the conversion.
    res.json({
      unit,
      entries: entries.map((entry) => ({
        id: entry._id,
        date: entry.date,
        weight: round1(fromKg(entry.weight, unit)),
      })),
      goalWeight: goalKg ? round1(fromKg(goalKg, unit)) : null,
      trend: {
        latest:
          trend.latest === null ? null : round1(fromKg(trend.latest, unit)),
        latestDate: trend.latestDate,
        change:
          trend.changeKg === null ? null : round1(fromKg(trend.changeKg, unit)),
        windowDays: trend.windowDays,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error loading weight history.", error: error.message });
  }
});

// POST /api/bodyweight  { weight, unit?, date? }
// One entry per calendar day — logging twice replaces, it doesn't duplicate.
router.post("/", requireAuth, async (req, res) => {
  try {
    const { weight, unit, date } = req.body;

    const day = date ? parseDayInput(date) : startOfUtcToday();
    if (!day) {
      return res.status(400).json({ message: "date must be YYYY-MM-DD." });
    }
    if (day > startOfUtcToday()) {
      return res
        .status(400)
        .json({ message: "Can't log a weight for a future date." });
    }

    const kg = normaliseWeight(weight, unit);
    if (kg === null) {
      return res.status(400).json({
        message: `weight must be a number between ${MIN_KG} and ${MAX_KG} kg.`,
      });
    }

    const entry = await BodyWeight.findOneAndUpdate(
      { user: req.user.dbId, date: day },
      { $set: { weight: kg } },
      { new: true, upsert: true },
    ).lean();

    res.status(201).json({ id: entry._id, date: entry.date });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error saving weight.", error: error.message });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    // Scoped by user as well as id — an id alone would be an IDOR.
    const result = await BodyWeight.deleteOne({
      _id: req.params.id,
      user: req.user.dbId,
    });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Entry not found." });
    }
    res.json({ message: "Entry removed." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error removing entry.", error: error.message });
  }
});

export default router;
