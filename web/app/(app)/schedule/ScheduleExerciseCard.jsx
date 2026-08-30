"use client";
import React, { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import apiClient from "@/lib/apiClient";
import EditExerciseModal from "./EditExerciseModal";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { useToast } from "@/app/components/ToastProvider";

const ScheduleExerciseCard = ({ exercise, day, onChanged }) => {
  const [removing, setRemoving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const toast = useToast();

  const removeExercise = async () => {
    if (removing) return;
    setRemoving(true);
    let succeeded = false;
    try {
      await apiClient.delete("/api/saveworkout", {
        data: { day, exerciseEntryId: exercise._id },
      });
      succeeded = true;
    } catch (error) {
      console.error("Error removing exercise:", error);
      toast.error("Couldn't remove that exercise. Please try again.");
      setRemoving(false);
      setConfirming(false);
    }

    // Outside the catch: onChanged unmounts this card, so anything after it
    // would run against a dead component — and a throw from the parent's
    // refetch must not be reported as a failed delete.
    if (succeeded) {
      toast.success(
        `${exercise.exerciseName} removed from ${day.toUpperCase()}`,
      );
      onChanged?.();
    }
  };

  const reps = Array.isArray(exercise.targetReps)
    ? exercise.targetReps.join(" / ")
    : null;

  const weights =
    exercise.usesWeight &&
    Array.isArray(exercise.targetWeight) &&
    exercise.targetWeight.length
      ? `${exercise.targetWeight.join(" / ")} ${exercise.weightUnit || "kg"}`
      : null;

  const iconButton =
    "p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-background transition-colors disabled:opacity-40";

  return (
    <>
      {/* bg-muted rather than bg-card — nested inside a card, it needs to
          read as a distinct surface in both light and dark. */}
      <div className="group relative flex gap-3 p-3 rounded-xl bg-muted">
        <img
          src={exercise.exerciseGif}
          alt=""
          loading="lazy"
          className="w-16 h-16 rounded-lg bg-white object-cover shrink-0"
        />

        <div className="flex-1 min-w-0">
          {/* pr-14 keeps the name clear of the action buttons, which sit in
              the top-right corner rather than taking a row of their own. */}
          <p className="capitalize font-medium leading-snug pr-14">
            {exercise.exerciseName}
          </p>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-sm text-muted-foreground">
            <span>
              {exercise.numberOfSets}{" "}
              {exercise.numberOfSets === 1 ? "set" : "sets"}
            </span>
            {reps && (
              <>
                <span aria-hidden="true">·</span>
                <span>{reps} reps</span>
              </>
            )}
          </div>

          {exercise.usesWeight && (
            <span
              className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full"
              style={
                weights
                  ? {
                      backgroundColor: "hsl(var(--info) / 0.14)",
                      color: "hsl(var(--info))",
                    }
                  : {
                      backgroundColor: "hsl(var(--warning) / 0.16)",
                      color: "hsl(var(--warning))",
                    }
              }
            >
              {weights || "No target weight"}
            </span>
          )}
        </div>

        <div className="absolute top-2.5 right-2.5 flex gap-0.5">
          <button
            onClick={() => setEditing(true)}
            aria-label={`Edit ${exercise.exerciseName}`}
            title="Edit"
            className={iconButton}
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => setConfirming(true)}
            aria-label={`Remove ${exercise.exerciseName}`}
            title="Remove"
            className={iconButton}
          >
            <Trash2 size={15} />
          </button>
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

      {confirming && (
        <ConfirmDialog
          title="Remove this exercise?"
          body={`${exercise.exerciseName} will be removed from ${day.toUpperCase()} from today onward. Workouts you've already logged keep it.`}
          confirmLabel="Remove"
          busy={removing}
          onConfirm={removeExercise}
          onClose={() => setConfirming(false)}
        />
      )}
    </>
  );
};

export default ScheduleExerciseCard;
