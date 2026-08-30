"use client";
import React from "react";
import {
  Typography,
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox,
} from "@mui/material";

// Controlled sets/reps/weight planner, shared by AddExeForm and
// EditExerciseModal. Owns no state — the parent holds `plan` and receives a
// whole new plan object on every change.
const SetPlanner = ({ plan, onChange }) => {
  const { numberOfSets, targetReps, usesWeight, targetWeight, weightUnit } =
    plan;

  const patch = (changes) => onChange({ ...plan, ...changes });

  const handleSetsChange = (e) => {
    const newCount = Math.max(
      0,
      Math.min(10, parseInt(e.target.value, 10) || 0),
    );
    patch({
      numberOfSets: newCount,
      targetReps: Array.from(
        { length: newCount },
        (_, i) => targetReps[i] ?? 0,
      ),
      targetWeight: Array.from(
        { length: newCount },
        (_, i) => targetWeight[i] ?? 0,
      ),
    });
  };

  const handleTargetRepChange = (index, value) => {
    const next = [...targetReps];
    next[index] = Math.max(0, parseInt(value, 10) || 0);
    patch({ targetReps: next });
  };

  const handleTargetWeightChange = (index, value) => {
    const next = [...targetWeight];
    next[index] = Math.max(0, parseFloat(value) || 0);
    patch({ targetWeight: next });
  };

  const handleUsesWeightToggle = (e) => {
    const checked = e.target.checked;
    patch({
      usesWeight: checked,
      targetWeight: checked
        ? Array.from({ length: numberOfSets }, (_, i) => targetWeight[i] ?? 0)
        : [],
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <TextField
        label="Number of sets"
        type="number"
        size="small"
        fullWidth
        inputProps={{ min: 0, max: 10 }}
        value={numberOfSets}
        onChange={handleSetsChange}
      />

      {numberOfSets > 0 && (
        <div className="flex flex-col gap-3">
          <Typography variant="body2" color="text.secondary">
            Target reps for each set
          </Typography>
          {Array.from({ length: numberOfSets }).map((_, i) => (
            <TextField
              key={i}
              label={`Set ${i + 1}`}
              type="number"
              size="small"
              fullWidth
              inputProps={{ min: 0 }}
              value={targetReps[i] ?? 0}
              onChange={(e) => handleTargetRepChange(i, e.target.value)}
            />
          ))}
        </div>
      )}

      <FormControlLabel
        control={
          <Checkbox
            color="error"
            checked={usesWeight}
            onChange={handleUsesWeightToggle}
          />
        }
        label={
          <Typography variant="body2">
            Track weight for this exercise
          </Typography>
        }
      />

      {usesWeight && numberOfSets > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <Typography variant="body2" color="text.secondary">
              Target weight for each set
            </Typography>
            <TextField
              select
              size="small"
              value={weightUnit}
              onChange={(e) => patch({ weightUnit: e.target.value })}
              sx={{ width: 90 }}
            >
              <MenuItem value="kg">kg</MenuItem>
              <MenuItem value="lb">lb</MenuItem>
            </TextField>
          </div>
          {Array.from({ length: numberOfSets }).map((_, i) => (
            <TextField
              key={i}
              label={`Set ${i + 1} (${weightUnit})`}
              type="number"
              size="small"
              fullWidth
              inputProps={{ step: 0.5, min: 0 }}
              value={targetWeight[i] ?? 0}
              onChange={(e) => handleTargetWeightChange(i, e.target.value)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SetPlanner;
