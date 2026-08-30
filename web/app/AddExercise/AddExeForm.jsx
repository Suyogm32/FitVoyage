"use client";
import React, { useState, useEffect } from "react";
import { Typography, Button, TextField, MenuItem } from "@mui/material";
import apiClient from "@/lib/apiClient";
import { usesWeightEquipment } from "@/app/utils/weightedEquipment";
import SetPlanner from "@/app/components/SetPlanner";

const DAY_OPTIONS = [
  { value: "mon", label: "Monday" },
  { value: "tue", label: "Tuesday" },
  { value: "wed", label: "Wednesday" },
  { value: "thu", label: "Thursday" },
  { value: "fri", label: "Friday" },
  { value: "sat", label: "Saturday" },
  { value: "sun", label: "Sunday" },
];

const AddExeForm = ({ exercise, setShowPopup, onScheduleChange }) => {
  const [submitting, setSubmitting] = useState(false);
  const defaultUsesWeight = usesWeightEquipment(exercise.equipment);

  const [userExercise, setUserExercise] = useState({
    exerciseName: exercise.name,
    exerciseId: exercise.id,
    exerciseGif: exercise.gifUrl,
    numberOfSets: 0,
    targetReps: [],
    usesWeight: defaultUsesWeight,
    targetWeight: [],
    weightUnit: "kg",
  });
  const [error, setError] = useState("");
  const [day, setDay] = useState("mon");

  // Pre-fill the weight unit from the user's saved preference. Only affects
  // the default shown here — doesn't overwrite the preference itself.
  useEffect(() => {
    let cancelled = false;
    apiClient
      .get("/api/user")
      .then((res) => {
        if (!cancelled && res.data?.preferredWeightUnit) {
          setUserExercise((prev) => ({
            ...prev,
            weightUnit: res.data.preferredWeightUnit,
          }));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const saveUserExercise = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await apiClient.put("/api/saveworkout", { day, userExercise });
      onScheduleChange?.();
      setShowPopup(false);
    } catch (err) {
      console.error("Error adding exercise:", err);
      setError("Failed to add exercise. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <TextField
        select
        label="Day"
        size="small"
        fullWidth
        value={day}
        onChange={(e) => setDay(e.target.value)}
      >
        {DAY_OPTIONS.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>

      <SetPlanner plan={userExercise} onChange={setUserExercise} />

      {error && <Typography color="error">{error}</Typography>}

      <Button
        variant="contained"
        color="error"
        disabled={submitting || userExercise.numberOfSets === 0}
        onClick={saveUserExercise}
      >
        {submitting ? "Adding..." : "Add to schedule"}
      </Button>
    </div>
  );
};

export default AddExeForm;
