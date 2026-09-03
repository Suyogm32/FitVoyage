"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Button, Typography, Chip } from "@mui/material";
import { useDraggable } from "@dnd-kit/core";
import { ChevronDown } from "lucide-react";

const statusColor = {
  incomplete: "default",
  partial: "warning",
  completed: "success",
};

// Tokens, not rgba literals — these were the last hardcoded colours in the
// workout flow, and the amber one didn't follow the theme.
const ACTION_STYLE = {
  increase: {
    bg: "hsl(var(--success) / 0.14)",
    fg: "hsl(var(--success))",
    label: "Step up",
  },
  hold: {
    bg: "hsl(var(--muted))",
    fg: "hsl(var(--muted-foreground))",
    label: "Hold",
  },
  deload: {
    bg: "hsl(var(--warning) / 0.16)",
    fg: "hsl(var(--warning))",
    label: "Back off",
  },
};

const describeSuggestion = (suggestion, unit) => {
  if (suggestion.usesWeight) {
    const weights = (suggestion.suggestedWeights || []).filter(
      (w) => w != null,
    );
    if (!weights.length) return null;
    return `${weights.join(" · ")} ${unit}`;
  }
  const reps = suggestion.suggestedReps || [];
  if (!reps.length) return null;
  return `${reps.join(" · ")} reps`;
};

const sameNumbers = (a, b) =>
  Array.isArray(a) &&
  Array.isArray(b) &&
  a.length === b.length &&
  a.every((value, i) => Number(value) === Number(b[i]));

const WorkoutCard = ({
  exercise,
  suggestion,
  onApplySuggestion,
  onLog,
  onEdit,
  onSwap,
}) => {
  const [applying, setApplying] = useState(false);
  const [showWhy, setShowWhy] = useState(false);

  const draggable = exercise.status === "incomplete";
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: exercise._id,
    disabled: !draggable,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 10,
      }
    : undefined;

  const showSuggestion =
    suggestion &&
    suggestion.action !== "none" &&
    exercise.status === "incomplete" &&
    ACTION_STYLE[suggestion.action];

  const suggestionText = showSuggestion
    ? describeSuggestion(suggestion, exercise.weightUnit || "kg")
    : null;

  const alreadyApplied =
    showSuggestion &&
    (suggestion.usesWeight
      ? sameNumbers(exercise.targetWeight, suggestion.suggestedWeights)
      : sameNumbers(exercise.targetReps, suggestion.suggestedReps));

  const handleApply = async () => {
    if (applying) return;
    setApplying(true);
    try {
      await onApplySuggestion(exercise, suggestion);
    } finally {
      setApplying(false);
    }
  };

  const reps = Array.isArray(exercise.targetReps)
    ? exercise.targetReps.join(" / ")
    : null;

  const action = showSuggestion ? ACTION_STYLE[suggestion.action] : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(draggable ? { ...attributes, ...listeners } : {})}
      className="mb-2"
    >
      <div className="flex gap-3 p-3 rounded-xl bg-muted">
        {/* The gif is the natural thing to tap to read about a movement.
            stopPropagation so the click isn't eaten by the drag sensor. */}
        <Link
          href={`/exercise/${exercise.exerciseId}`}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="shrink-0"
          title={`About ${exercise.exerciseName}`}
        >
          <img
            src={exercise.exerciseGif}
            alt=""
            loading="lazy"
            className="w-20 h-20 rounded-lg bg-white object-cover hover:opacity-80 transition-opacity"
          />
        </Link>

        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/exercise/${exercise.exerciseId}`}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="capitalize font-medium leading-snug min-w-0 hover:opacity-70"
            >
              {exercise.exerciseName}
            </Link>
            <Chip
              label={exercise.status}
              color={statusColor[exercise.status]}
              size="small"
              className="shrink-0"
            />
          </div>

          {/* One line instead of two label-value rows — the card lives in a
              narrow column and this is one fact about the exercise. */}
          <Typography variant="body2" color="text.secondary">
            {exercise.numberOfSets}{" "}
            {exercise.numberOfSets === 1 ? "set" : "sets"}
            {reps && ` · ${reps} reps`}
          </Typography>

          <div className="flex gap-1 flex-wrap">
            {exercise.unplanned && (
              <Chip label="extra" size="small" variant="outlined" />
            )}
            {exercise.substitutedBy && (
              <Chip
                label={`swapped → ${exercise.substitutedBy.exerciseName}`}
                size="small"
                variant="outlined"
                sx={{ textTransform: "capitalize", maxWidth: "100%" }}
              />
            )}
          </div>

          {suggestionText && (
            <div
              className="rounded-lg px-2.5 py-2 mt-0.5"
              style={{ backgroundColor: action.bg }}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-xs font-medium px-1.5 py-0.5 rounded"
                  style={{ color: action.fg }}
                >
                  {action.label}
                </span>
                <span className="text-sm flex-1 min-w-0">{suggestionText}</span>
                {alreadyApplied ? (
                  <span className="text-xs text-muted-foreground shrink-0">
                    Applied
                  </span>
                ) : (
                  onApplySuggestion && (
                    <Button
                      size="small"
                      variant="text"
                      color="error"
                      disabled={applying}
                      onClick={handleApply}
                      className="shrink-0"
                      sx={{ minWidth: 0, px: 1 }}
                    >
                      {applying ? "…" : "Apply"}
                    </Button>
                  )
                )}
              </div>

              {/* The reasoning stays available — it's the whole point of a
                  rule engine over a black box — but three lines of it in a
                  narrow column pushed everything else off screen. */}
              <button
                onClick={() => setShowWhy((prev) => !prev)}
                className="flex items-center gap-1 text-xs text-muted-foreground mt-1 hover:opacity-70"
              >
                Why?
                <ChevronDown
                  size={12}
                  style={{
                    transform: showWhy ? "rotate(180deg)" : "none",
                    transition: "transform 150ms",
                  }}
                />
              </button>
              {showWhy && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  className="block mt-1"
                >
                  {suggestion.explain}
                </Typography>
              )}
            </div>
          )}

          <div className="flex gap-1 justify-end mt-0.5">
            {exercise.status === "incomplete" ? (
              <>
                {onSwap && !exercise.unplanned && (
                  <Button size="small" onClick={() => onSwap(exercise)}>
                    Swap
                  </Button>
                )}
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={() => onLog(exercise)}
                >
                  Log sets
                </Button>
              </>
            ) : (
              <Button size="small" onClick={() => onEdit(exercise)}>
                Edit
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkoutCard;
