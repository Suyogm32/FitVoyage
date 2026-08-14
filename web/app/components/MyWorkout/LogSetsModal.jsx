"use client";
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Stack,
} from "@mui/material";

const LogSetsModal = ({ exercise, onSave, onClose }) => {
  const [reps, setReps] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!exercise) return;
    const existing = exercise.setsCompleted || [];
    const initial = Array.from({ length: exercise.numberOfSets }, (_, i) => {
      const match = existing.find((s) => s.setNumber === i + 1);
      return match ? match.repsCompleted : "";
    });
    setReps(initial);
  }, [exercise]);

  if (!exercise) return null;

  const hasTargets =
    Array.isArray(exercise.targetReps) &&
    exercise.targetReps.length === exercise.numberOfSets;

  const handleRepChange = (index, value) => {
    const newReps = [...reps];
    newReps[index] = value;
    setReps(newReps);
  };

  const handleSave = async () => {
    setSaving(true);
    const setsCompleted = reps.map((r, i) => ({
      setNumber: i + 1,
      targetReps: exercise.targetReps[i],
      repsCompleted: Number(r) || 0,
    }));
    await onSave(setsCompleted);
    setSaving(false);
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle textTransform="capitalize">
        {exercise.exerciseName}
      </DialogTitle>
      <DialogContent>
        {!hasTargets ? (
          <Typography color="error">
            This exercise doesn&apos;t have set targets saved. Remove it from
            your schedule and re-add it before logging sets.
          </Typography>
        ) : (
          <Stack gap={2} mt={1}>
            {exercise.targetReps.map((target, i) => (
              <Stack key={i} direction="row" gap={1} alignItems="center">
                <TextField
                  label={`Set ${i + 1} — target ${target}`}
                  type="number"
                  size="small"
                  value={reps[i] ?? ""}
                  onChange={(e) => handleRepChange(i, e.target.value)}
                  fullWidth
                />
                <Button size="small" onClick={() => handleRepChange(i, 0)}>
                  Skip
                </Button>
              </Stack>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!hasTargets || saving}
          onClick={handleSave}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LogSetsModal;
