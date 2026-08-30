"use client";
import React, { useState } from "react";
import { Button, Typography, Chip } from "@mui/material";
import { useDraggable } from "@dnd-kit/core";

const statusColor = {
  incomplete: "default",
  partial: "warning",
  completed: "success",
};

const ACTION_STYLE = {
  increase: { bg: "hsl(var(--primary) / 0.12)", label: "Step up" },
  hold: { bg: "rgba(0,0,0,0.05)", label: "Hold" },
  deload: { bg: "rgba(234,179,8,0.15)", label: "Back off" },
};

const describeSuggestion = (suggestion, unit) => {
  if (suggestion.usesWeight) {
    const weights = (suggestion.suggestedWeights || []).filter(
      (w) => w != null,
    );
    if (!weights.length) return null;
    return `Try ${weights.join(" · ")} ${unit}`;
  }
  const reps = suggestion.suggestedReps || [];
  if (!reps.length) return null;
  return `Try ${reps.join(" · ")} reps`;
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
}) => {
  const [applying, setApplying] = useState(false);
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

  // Only worth showing before the exercise is logged — afterwards the
  // advice is about a session that already happened.
  const showSuggestion =
    suggestion &&
    suggestion.action !== "none" &&
    exercise.status === "incomplete" &&
    ACTION_STYLE[suggestion.action];

  const suggestionText = showSuggestion
    ? describeSuggestion(suggestion, exercise.weightUnit || "kg")
    : null;

  // Once the plan already matches the advice there's nothing left to apply.
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(draggable ? { ...attributes, ...listeners } : {})}
      className="mb-2"
    >
      <div className="grid grid-cols-[0.5fr_1.5fr] gap-3 p-2.5 rounded-lg bg-muted">
        <div className="flex justify-center items-center">
          <img
            src={exercise.exerciseGif}
            alt={exercise.exerciseName}
            className="rounded-md"
          />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center gap-2">
            <Typography textTransform={"capitalize"}>
              {exercise.exerciseName}
            </Typography>
            <div className="flex gap-1 shrink-0">
              {exercise.unplanned && (
                <Chip label="extra" size="small" variant="outlined" />
              )}
              <Chip
                label={exercise.status}
                color={statusColor[exercise.status]}
                size="small"
              />
            </div>
          </div>
          <Typography>Sets - {exercise.numberOfSets}</Typography>
          <Typography>
            Targets -{" "}
            {Array.isArray(exercise.targetReps)
              ? exercise.targetReps.join(", ")
              : "not set"}
          </Typography>

          {suggestionText && (
            <div
              className="rounded-md p-2 mt-1"
              style={{ backgroundColor: ACTION_STYLE[suggestion.action].bg }}
            >
              <div className="flex items-center justify-between gap-2">
                <Typography variant="body2" fontWeight={500}>
                  {ACTION_STYLE[suggestion.action].label} · {suggestionText}
                </Typography>
                {alreadyApplied ? (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    className="shrink-0"
                  >
                    Applied
                  </Typography>
                ) : (
                  onApplySuggestion && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      disabled={applying}
                      onClick={handleApply}
                      className="shrink-0"
                    >
                      {applying ? "..." : "Apply"}
                    </Button>
                  )
                )}
              </div>
              <Typography variant="caption" color="text.secondary">
                {suggestion.explain}
              </Typography>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            {exercise.status === "incomplete" ? (
              <Button
                type="button"
                onClick={() => onLog(exercise)}
                className="rounded-lg"
              >
                Log Sets
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => onEdit(exercise)}
                className="rounded-lg"
              >
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
