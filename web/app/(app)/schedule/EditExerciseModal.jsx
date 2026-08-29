"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";
import apiClient from "@/lib/apiClient";
import SetPlanner from "@/app/components/SetPlanner";

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
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle textTransform="capitalize">
        {exercise.exerciseName}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" className="mb-3">
          Changes apply from today onward — past workouts keep the targets they
          were logged against.
        </Typography>
        <SetPlanner plan={plan} onChange={setPlan} />
        {error && <Typography color="error">{error}</Typography>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={submitting} onClick={handleSave}>
          {submitting ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditExerciseModal;
