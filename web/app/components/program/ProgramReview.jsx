"use client";
import React, { useState, useEffect } from "react";
import { Typography, Button, TextField } from "@mui/material";
import { RefreshCw, Pencil, X, Check } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { cardClass } from "@/lib/styles";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { useToast } from "@/app/components/ToastProvider";

const textMuted = { color: "hsl(var(--muted-foreground))" };

// Status, not brand. Green reads as "being added", blue as "already here".
// Both are accent-independent so the legend keeps its meaning after a theme
// switch — and red is reserved for genuine destructive states.
const ROW_STYLES = {
  new: {
    backgroundColor: "hsl(var(--success) / 0.12)",
    borderLeft: "3px solid hsl(var(--success))",
  },
  existing: {
    backgroundColor: "hsl(var(--info) / 0.07)",
    borderLeft: "3px solid hsl(var(--info) / 0.45)",
  },
};

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABELS = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

// Combines what's already scheduled with what the AI produced, so the user
// curates the final state rather than guessing what a merge will do.
//
// For week scope every day is included, not just generated ones — applying
// a week replaces all seven, so a day the AI skipped would be silently
// wiped if it weren't shown here.
const buildMergedDays = (generatedDays, currentSchedule, scope) => {
  const generatedByDay = new Map(generatedDays.map((day) => [day.day, day]));
  const daysToShow =
    scope === "week" ? DAY_KEYS : generatedDays.map((day) => day.day);

  return daysToShow
    .map((dayKey) => {
      const existing = (currentSchedule?.[dayKey] || []).map((entry) => ({
        exerciseId: entry.exerciseId,
        exerciseName: entry.exerciseName,
        exerciseGif: entry.exerciseGif,
        sets: entry.numberOfSets,
        reps: entry.targetReps || [],
        source: "existing",
      }));

      const existingIds = new Set(existing.map((entry) => entry.exerciseId));
      const generated = (generatedByDay.get(dayKey)?.exercises || [])
        // Only add what isn't already there — a duplicate row would be
        // confusing and would double the volume on apply.
        .filter((exercise) => !existingIds.has(exercise.exerciseId))
        .map((exercise) => ({
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.exerciseName,
          exerciseGif: exercise.exerciseGif,
          sets: exercise.sets,
          reps: exercise.reps,
          source: "new",
        }));

      return {
        day: dayKey,
        focus: generatedByDay.get(dayKey)?.focus || "",
        exercises: [...existing, ...generated],
      };
    })
    .filter((day) => day.exercises.length > 0);
};

const ProgramReview = ({
  generated,
  scope,
  canRegenerate = true,
  onRegenerate,
  onDiscard,
  onApplied,
}) => {
  const [days, setDays] = useState(null);
  const [editingKey, setEditingKey] = useState(null);
  const [draft, setDraft] = useState({ sets: "", reps: "" });
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get("/api/myschedule")
      .then((res) => {
        if (cancelled) return;
        const schedule = res.data?.[0]?.schedule || {};
        setDays(buildMergedDays(generated.days, schedule, scope));
      })
      .catch(() => {
        // Without the current schedule we can still review the generated
        // plan — it just won't show what's already there.
        if (!cancelled) setDays(buildMergedDays(generated.days, {}, scope));
      });
    return () => {
      cancelled = true;
    };
  }, [generated, scope]);

  const removeExercise = (dayKey, exerciseId) => {
    setDays((prev) =>
      prev
        .map((day) =>
          day.day === dayKey
            ? {
                ...day,
                exercises: day.exercises.filter(
                  (e) => e.exerciseId !== exerciseId,
                ),
              }
            : day,
        )
        // A day emptied out becomes a rest day, which is a legitimate choice.
        .filter((day) => day.exercises.length > 0),
    );
  };

  const startEdit = (dayKey, exercise) => {
    setEditingKey(`${dayKey}:${exercise.exerciseId}`);
    setDraft({ sets: String(exercise.sets), reps: exercise.reps.join("/") });
  };

  const commitEdit = (dayKey, exerciseId) => {
    const sets = Math.max(1, Math.min(10, Number(draft.sets) || 1));
    const reps = draft.reps
      .split("/")
      .map((value) => Math.max(1, Math.min(100, Number(value.trim()) || 0)))
      .filter(Boolean);

    // Reps must line up with sets — pad with the last value or truncate.
    const normalised = Array.from(
      { length: sets },
      (_, i) => reps[i] ?? reps[reps.length - 1] ?? 10,
    );

    setDays((prev) =>
      prev.map((day) =>
        day.day === dayKey
          ? {
              ...day,
              exercises: day.exercises.map((exercise) =>
                exercise.exerciseId === exerciseId
                  ? { ...exercise, sets, reps: normalised }
                  : exercise,
              ),
            }
          : day,
      ),
    );
    setEditingKey(null);
  };

  const apply = async () => {
    if (applying) return;
    setApplying(true);
    setError("");

    let succeeded = false;
    try {
      await apiClient.post("/api/program/apply", {
        scope,
        days: days.map((day) => ({
          day: day.day,
          exercises: day.exercises.map((exercise) => ({
            exerciseId: exercise.exerciseId,
            sets: exercise.sets,
            reps: exercise.reps,
          })),
        })),
      });
      succeeded = true;
    } catch (err) {
      console.error("Apply failed:", err);
      setError(
        err.response?.data?.message ||
          "Couldn't apply this program. Please try again.",
      );
    } finally {
      setApplying(false);
    }

    // Outside the try on purpose — a bug in the caller's callback must not
    // be reported to the user as an API failure.
    if (succeeded) {
      const total = days.reduce((sum, day) => sum + day.exercises.length, 0);
      toast.success(
        scope === "week"
          ? `Weekly schedule replaced — ${total} exercises across ${days.length} days`
          : `${DAY_LABELS[days[0]?.day]} replaced — ${total} exercises`,
      );
      setConfirming(false);
      onApplied?.();
    } else {
      setConfirming(false);
    }
  };

  if (!days)
    return <Typography sx={textMuted}>Loading your schedule…</Typography>;

  const newCount = days.reduce(
    (total, day) =>
      total + day.exercises.filter((e) => e.source === "new").length,
    0,
  );

  return (
    <div className="max-w-2xl flex flex-col gap-4">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <div>
          <Typography variant="h6">Review your program</Typography>
          <Typography variant="body2" sx={textMuted}>
            {newCount} new exercise{newCount === 1 ? "" : "s"} · generated by{" "}
            {generated.provider}
          </Typography>
        </div>
        <div className="flex gap-3 text-xs items-center">
          <span className="flex items-center gap-1.5" style={textMuted}>
            <span
              className="w-2.5 h-2.5 rounded-sm inline-block"
              style={{ backgroundColor: "hsl(var(--success))" }}
            />
            new
          </span>
          <span className="flex items-center gap-1.5" style={textMuted}>
            <span
              className="w-2.5 h-2.5 rounded-sm inline-block"
              style={{ backgroundColor: "hsl(var(--info) / 0.55)" }}
            />
            already scheduled
          </span>
        </div>
      </div>

      {days.map((day) => (
        <div key={day.day} className={`${cardClass} p-4`}>
          <div className="flex justify-between items-baseline mb-3">
            <Typography fontWeight={500}>{DAY_LABELS[day.day]}</Typography>
            <Typography
              variant="body2"
              sx={textMuted}
              textTransform="capitalize"
            >
              {day.focus}
            </Typography>
          </div>

          <div className="flex flex-col gap-1.5">
            {day.exercises.map((exercise) => {
              const key = `${day.day}:${exercise.exerciseId}`;
              const isEditing = editingKey === key;
              return (
                <div
                  key={key}
                  className="flex items-center gap-3 p-2 rounded-lg"
                  style={ROW_STYLES[exercise.source] || ROW_STYLES.existing}
                >
                  {exercise.exerciseGif ? (
                    <img
                      src={exercise.exerciseGif}
                      alt=""
                      className="w-9 h-9 rounded-md shrink-0 object-cover bg-white"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-md shrink-0 bg-muted" />
                  )}

                  <Typography
                    variant="body2"
                    className="flex-1 min-w-0"
                    textTransform="capitalize"
                    noWrap
                  >
                    {exercise.exerciseName}
                  </Typography>

                  {isEditing ? (
                    <div className="flex gap-1.5 items-center shrink-0">
                      <TextField
                        size="small"
                        label="Sets"
                        value={draft.sets}
                        onChange={(e) =>
                          setDraft({ ...draft, sets: e.target.value })
                        }
                        sx={{ width: 70 }}
                      />
                      <TextField
                        size="small"
                        label="Reps"
                        value={draft.reps}
                        onChange={(e) =>
                          setDraft({ ...draft, reps: e.target.value })
                        }
                        sx={{ width: 110 }}
                      />
                      <Button
                        size="small"
                        onClick={() => commitEdit(day.day, exercise.exerciseId)}
                      >
                        <Check size={16} />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Typography
                        variant="caption"
                        sx={textMuted}
                        className="shrink-0"
                      >
                        {exercise.sets} × {exercise.reps.join("/")}
                      </Typography>
                      <button
                        onClick={() => startEdit(day.day, exercise)}
                        aria-label={`Edit ${exercise.exerciseName}`}
                        className="p-1 rounded hover:bg-muted shrink-0"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() =>
                          removeExercise(day.day, exercise.exerciseId)
                        }
                        aria-label={`Remove ${exercise.exerciseName}`}
                        className="p-1 rounded hover:bg-muted shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {error && <Typography color="error">{error}</Typography>}

      <Typography variant="caption" sx={textMuted}>
        {scope === "week"
          ? "Applying replaces your whole weekly schedule. Past workouts keep the plan they were logged against."
          : `Applying replaces ${DAY_LABELS[days[0]?.day] || "that day"} only.`}
      </Typography>

      <div className="flex gap-2 justify-end">
        <Button onClick={onDiscard} disabled={applying}>
          Discard
        </Button>
        <Button
          onClick={onRegenerate}
          disabled={applying || !canRegenerate}
          startIcon={<RefreshCw size={15} />}
          title={canRegenerate ? undefined : "No generations left today"}
        >
          Regenerate
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={() => setConfirming(true)}
          disabled={applying}
        >
          {applying ? "Applying…" : "Apply to schedule"}
        </Button>
      </div>
      {confirming && (
        <ConfirmDialog
          title={
            scope === "week"
              ? "Replace your whole week?"
              : `Replace ${DAY_LABELS[days[0]?.day]}?`
          }
          body={
            scope === "week"
              ? "Every day in your current schedule is replaced by what's shown here. Workouts you've already logged keep the plan they were logged against, so your history is untouched."
              : `Everything currently scheduled on ${DAY_LABELS[days[0]?.day]} is replaced. Already-logged workouts keep the plan they were logged against.`
          }
          confirmLabel="Apply"
          busy={applying}
          onConfirm={apply}
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  );
};

export default ProgramReview;
