"use client";
import React, { useState } from "react";
import { Button, Typography } from "@mui/material";
import { X } from "lucide-react";
import apiClient from "@/lib/apiClient";
import EditExerciseModal from "./EditExerciseModal";

const ScheduleExerciseCard = ({ exercise, day, onChanged }) => {
  const [removing, setRemoving] = useState(false);
  const [editing, setEditing] = useState(false);

  const removeExercise = async () => {
    if (removing) return;
    setRemoving(true);
    try {
      await apiClient.delete("/api/saveworkout", {
        data: { day, exerciseEntryId: exercise._id },
      });
      onChanged?.();
    } catch (error) {
      console.error("Error removing exercise:", error);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
      {/* bg-muted rather than bg-card — nested inside a card, it needs to
          read as a distinct surface in both light and dark. */}
      <div className="grid grid-cols-[0.5fr_1.5fr] gap-3 p-2.5 rounded-lg bg-muted">
        <div className="flex justify-center items-center">
          <img
            src={exercise.exerciseGif}
            alt={exercise.exerciseName}
            className="rounded-md bg-white"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Typography textTransform="capitalize">
            {exercise.exerciseName}
          </Typography>
          <Typography variant="body2">
            Sets - {exercise.numberOfSets}
          </Typography>
          <Typography variant="body2">
            Targets -{" "}
            {Array.isArray(exercise.targetReps)
              ? exercise.targetReps.join(", ")
              : "not set"}{" "}
            reps
          </Typography>
          {exercise.usesWeight && (
            <Typography variant="body2">
              Weight -{" "}
              {Array.isArray(exercise.targetWeight) &&
              exercise.targetWeight.length
                ? exercise.targetWeight.join(", ")
                : "not set"}{" "}
              {exercise.weightUnit || "kg"}
            </Typography>
          )}
          <div className="flex gap-2 items-center">
            <Button size="small" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button size="small" onClick={removeExercise} disabled={removing}>
              <X size={18} />
            </Button>
          </div>
        </div>
      </div>

      {editing && (
        <EditExerciseModal
          exercise={exercise}
          day={day}
          onClose={() => setEditing(false)}
          onSaved={onChanged}
        />
      )}
    </>
  );
};

export default ScheduleExerciseCard;
