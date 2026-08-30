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

const FEEL_OPTIONS = [
  { value: "easy", label: "Easy" },
  { value: "just_right", label: "Just right" },
  { value: "struggled", label: "Struggled" },
];

const LogSetsModal = ({ exercise, coachMode, onSave, onClose }) => {
  const [reps, setReps] = useState([]);
  const [weights, setWeights] = useState([]);
  const [feel, setFeel] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!exercise) return;
    const existing = exercise.setsCompleted || [];

    const initialReps = Array.from(
      { length: exercise.numberOfSets },
      (_, i) => {
        const match = existing.find((s) => s.setNumber === i + 1);
        return match ? match.repsCompleted : "";
      },
    );

    // Prefill weight with what was already logged, falling back to the
    // planned target so the common case is a confirmation, not retyping.
    const initialWeights = Array.from(
      { length: exercise.numberOfSets },
      (_, i) => {
        const match = existing.find((s) => s.setNumber === i + 1);
        if (
          match &&
          match.weightUsed !== null &&
          match.weightUsed !== undefined
        ) {
          return match.weightUsed;
        }
        return exercise.targetWeight?.[i] ?? "";
      },
    );

    setReps(initialReps);
    setWeights(initialWeights);
    setFeel(exercise.feel || null);
  }, [exercise]);

  if (!exercise) return null;

  const hasTargets =
    Array.isArray(exercise.targetReps) &&
    exercise.targetReps.length === exercise.numberOfSets;

  const tracksWeight = Boolean(exercise.usesWeight);
  const unit = exercise.weightUnit || "kg";

  const handleRepChange = (index, value) => {
    const next = [...reps];
    next[index] = value;
    setReps(next);
  };

  const handleWeightChange = (index, value) => {
    const next = [...weights];
    next[index] = value;
    setWeights(next);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const setsCompleted = reps.map((r, i) => ({
        setNumber: i + 1,
        targetReps: exercise.targetReps[i],
        repsCompleted: Number(r) || 0,
        ...(tracksWeight && {
          targetWeight: exercise.targetWeight?.[i] ?? null,
          weightUsed: Number(weights[i]) || 0,
          weightUnit: unit,
        }),
      }));
      await onSave(setsCompleted, coachMode ? feel : null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
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
                {tracksWeight && (
                  <TextField
                    label={`Weight (${unit})`}
                    type="number"
                    size="small"
                    placeholder="start light"
                    inputProps={{ step: 0.5, min: 0 }}
                    value={weights[i] ?? ""}
                    onChange={(e) => handleWeightChange(i, e.target.value)}
                    sx={{ width: 140 }}
                  />
                )}
                <Button size="small" onClick={() => handleRepChange(i, 0)}>
                  Skip
                </Button>
              </Stack>
            ))}

            {coachMode && (
              <div>
                <Typography variant="body2" className="mb-2">
                  How did that feel?
                </Typography>
                <Stack direction="row" gap={1}>
                  {FEEL_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      size="small"
                      color="error"
                      variant={feel === option.value ? "contained" : "outlined"}
                      onClick={() => setFeel(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </Stack>
              </div>
            )}
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
