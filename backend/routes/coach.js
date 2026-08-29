import { Router } from "express";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import { requireAuth } from "../middleware/auth.js";
import { Workouts } from "../models/Workouts.js";
import { WorkoutsLog } from "../models/WorkoutsLog.js";
import { User } from "../models/User.js";
import { isActiveOn } from "../utils/scheduleActive.js";
import { buildSuggestion } from "../utils/progression.js";

dayjs.extend(customParseFormat);

const router = Router();

const DATE_FORMAT = "DD/MM/YY";
const HISTORY_DEPTH = 5;

// GET /api/coach/suggest?date=DD/MM/YY&day=mon
//
// Read-only: computes a suggestion per scheduled exercise from that
// exercise's own recent history. Phase 3 will layer an LLM adjustment on
// top of these baselines — this route must keep working if that fails.
router.get("/suggest", requireAuth, async (req, res) => {
  try {
    const userId = req.user.dbId;
    const { date, day } = req.query;

    if (!date || !day) {
      return res.status(400).json({ message: "Missing date or day." });
    }

    const refDate = dayjs(date, DATE_FORMAT, true);
    if (!refDate.isValid()) {
      return res.status(400).json({ message: "Invalid date format. Expected DD/MM/YY." });
    }

    const [userDoc, workoutDoc, logDoc] = await Promise.all([
      User.findById(userId).select("coachMode").lean(),
      Workouts.findOne({ user: userId }).lean(),
      WorkoutsLog.findOne({ user: userId }).lean(),
    ]);

    // Coach mode is the gate — an opted-out user gets nothing, and the
    // frontend renders exactly as it did before this feature existed.
    if (!userDoc?.coachMode) {
      return res.json({ coachMode: false, suggestions: [] });
    }

    const daySchedule = (workoutDoc?.schedule?.[day] || []).filter((ex) =>
      isActiveOn(ex, refDate),
    );

    const entries = (logDoc?.exercises_done || [])
      .map((entry) => ({ ...entry, parsedDate: dayjs(entry.date, DATE_FORMAT, true) }))
      .filter((entry) => entry.parsedDate.isValid())
      .sort((a, b) => b.parsedDate.valueOf() - a.parsedDate.valueOf());

    const todayReadiness =
      entries.find((entry) => entry.date === date && entry.day === day)?.readiness || null;

    const suggestions = daySchedule.map((exercise) => {
      // History for this exercise only, excluding the session being
      // suggested for — otherwise today's own log would advise today.
      const sessions = [];
      for (const entry of entries) {
        if (entry.date === date) continue;
        const logged = entry.exercises?.find((ex) => ex.exercise_ID === exercise.exerciseId);
        if (!logged) continue;
        sessions.push({
          date: entry.date,
          feel: logged.feel,
          setsCompleted: logged.setsCompleted || [],
        });
        if (sessions.length >= HISTORY_DEPTH) break;
      }

      return {
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        ...buildSuggestion({ sessions, todayReadiness }),
      };
    });

    res.json({ coachMode: true, readiness: todayReadiness, suggestions });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error building suggestions.", error: error.message });
  }
});

export default router;