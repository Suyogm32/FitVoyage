"use client";
import React from "react";
import { Typography } from "@mui/material";

// Controlled sets/reps/weight planner, shared by AddExeForm (creating a
// schedule entry) and EditExerciseModal (versioned edit of one). Owns no
// state — the parent holds `plan` and receives a whole new plan object on
// every change.
//
// plan: { numberOfSets, targetReps[], usesWeight, targetWeight[], weightUnit }
const SetPlanner = ({ plan, onChange }) => {
  const { numberOfSets, targetReps, usesWeight, targetWeight, weightUnit } =
    plan;

  const patch = (changes) => onChange({ ...plan, ...changes });

  // Resizes both arrays to match the new set count, keeping existing values.
  const handleSetsChange = (e) => {
    const newCount = Math.max(0, parseInt(e.target.value, 10) || 0);
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
    <div className="flex flex-col gap-4 w-full">
      <input
        type="number"
        name="Sets"
        min="0"
        placeholder="Number of Sets"
        value={numberOfSets}
        onChange={handleSetsChange}
        className="p-4 py-2"
      />

      {numberOfSets > 0 && (
        <div className="flex flex-col gap-2 w-full">
          <Typography variant="body2">Target reps for each set</Typography>
          {Array.from({ length: numberOfSets }).map((_, i) => (
            <input
              key={i}
              type="number"
              min="0"
              placeholder={`Set ${i + 1} target reps`}
              value={targetReps[i] ?? 0}
              onChange={(e) => handleTargetRepChange(i, e.target.value)}
              className="p-4 py-2 w-full"
            />
          ))}
        </div>
      )}

      <label className="flex items-center gap-2 w-full">
        <input
          type="checkbox"
          checked={usesWeight}
          onChange={handleUsesWeightToggle}
        />
        <Typography variant="body2">Track weight for this exercise</Typography>
      </label>

      {usesWeight && numberOfSets > 0 && (
        <div className="flex flex-col gap-2 w-full">
          <div className="flex items-center justify-between w-full">
            <Typography variant="body2">Target weight for each set</Typography>
            <select
              value={weightUnit}
              onChange={(e) => patch({ weightUnit: e.target.value })}
              className="p-2"
            >
              <option value="kg">kg</option>
              <option value="lb">lb</option>
            </select>
          </div>
          {Array.from({ length: numberOfSets }).map((_, i) => (
            <input
              key={i}
              type="number"
              min="0"
              step="0.5"
              placeholder={`Set ${i + 1} target weight (${weightUnit})`}
              value={targetWeight[i] ?? 0}
              onChange={(e) => handleTargetWeightChange(i, e.target.value)}
              className="p-4 py-2 w-full"
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SetPlanner;
