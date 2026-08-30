"use client";
import React, { useState } from "react";
import { Button, Typography } from "@mui/material";
import apiClient from "@/lib/apiClient";
import SetPlanner from "@/app/components/SetPlanner";
import SidePanel from "@/app/components/SidePanel";

const EditExerciseModal = ({ exercise, day, onClose, onSaved }) => {
  const [plan, setPlan] = useState({
    numberOfSets: exercise.numberOfSets || 0,
    targetReps: exercise.targetReps || [],
    usesWeight: exercise.usesWeight || false,
    targetWeight: exercise.targetWeight || [],
    weightUnit: exercise.weightUnit || "kg",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await apiClient.patch("/api/saveworkout", {
        day,
        exerciseEntryId: exercise._id,
        updates: plan,
      });
      onSaved?.();
      onClose();
    } catch (err) {
      console.error("Error updating exercise:", err);
      setError("Failed to save changes. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SidePanel
      title="Edit exercise"
      subtitle={exercise.exerciseName}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={submitting || !plan.numberOfSets}
            onClick={handleSave}
          >
            {submitting ? "Saving..." : "Save"}
          </Button>
        </>
      }
    >
      <Typography variant="body2" color="text.secondary" className="mb-4">
        Changes apply from today onward — past workouts keep the targets they
        were logged against.
      </Typography>

      <SetPlanner plan={plan} onChange={setPlan} />

      {error && (
        <Typography color="error" className="mt-3">
          {error}
        </Typography>
      )}
    </SidePanel>
  );
};

export default EditExerciseModal;
