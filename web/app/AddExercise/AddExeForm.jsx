"use client";
import React, { useState, useEffect } from "react";
import { Typography, Button } from "@mui/material";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";
import { usesWeightEquipment } from "@/app/utils/weightedEquipment";
import SetPlanner from "@/app/components/SetPlanner";

const AddExeForm = ({ exercise, setShowPopup, onScheduleChange }) => {
  const router = useRouter();
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

  // Pre-fill the weight unit from the user's saved preference, if they have
  // one. Only affects the default shown here — doesn't overwrite the
  // preference itself.
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
      .catch(() => {
        // Non-critical — just keep the "kg" default.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const saveUserExercise = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await apiClient.put("/api/saveworkout", { day, userExercise });
      onScheduleChange?.();
      setShowPopup(false);
      router.push("/schedule");
    } catch (err) {
      console.error("Error adding exercise:", err);
      setError("Failed to add exercise. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center bg-mybg p-8 rounded-xl gap-4">
      <Typography variant="h4" textTransform={"capitalize"} display={"inline"}>
        Add this Exercise to your schedule
      </Typography>
      <div className="flex flex-col gap-4 justify-center items-start w-full">
        <input
          type="text"
          name="ExerciseName"
          placeholder={exercise.name}
          value={userExercise.exerciseName}
          className="p-4 py-2"
          readOnly
        />
        <select
          value={day}
          onChange={(e) => setDay(e.target.value)}
          className="p-4 py-2 w-full"
        >
          <option value="mon">Monday</option>
          <option value="tue">Tuesday</option>
          <option value="wed">Wednesday</option>
          <option value="thu">Thursday</option>
          <option value="fri">Friday</option>
          <option value="sat">Saturday</option>
          <option value="sun">Sunday</option>
        </select>

        <SetPlanner plan={userExercise} onChange={setUserExercise} />

        {error && <Typography color="error">{error}</Typography>}

        <Button
          onClick={saveUserExercise}
          variant="contained"
          color="error"
          disabled={submitting}
          className="place-self-center"
        >
          {submitting ? "Adding..." : "Add"}
        </Button>
      </div>
    </div>
  );
};

export default AddExeForm;
