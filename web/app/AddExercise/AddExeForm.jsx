"use client";
import React, { useState } from "react";
import { Typography, Button } from "@mui/material";
import axios from "axios";
import { useRouter } from "next/navigation";

const AddExeForm = ({ exercise, setShowPopup }) => {
  const ss = typeof window !== "undefined" ? window.sessionStorage : null;
  const router = useRouter();

  let initialState = {
    exerciseName: exercise.name,
    exerciseId: exercise.id,
    exerciseGif: exercise.gifUrl,
    numberOfSets: 0,
    targetReps: [],
  };

  const [userExercise, setUserExercise] = useState(initialState);
  const [error, setError] = useState("");
  const [day, setDay] = useState("mon");

  const PutAttribute = (e, attribute) => {
    const newExercise = { ...userExercise };
    newExercise[attribute] = e.target.value;
    setUserExercise(newExercise);
  };

  // Resizes targetReps to match the new set count, keeping existing values
  const handleSetsChange = (e) => {
    const newCount = Math.max(0, parseInt(e.target.value, 10) || 0);
    setUserExercise((prev) => {
      const newTargetReps = Array.from(
        { length: newCount },
        (_, i) => prev.targetReps[i] ?? 0,
      );
      return { ...prev, numberOfSets: newCount, targetReps: newTargetReps };
    });
  };

  const handleTargetRepChange = (index, value) => {
    const repValue = Math.max(0, parseInt(value, 10) || 0);
    setUserExercise((prev) => {
      const newTargetReps = [...prev.targetReps];
      newTargetReps[index] = repValue;
      return { ...prev, targetReps: newTargetReps };
    });
  };

  const saveUserExercise = async (e) => {
    e.preventDefault();
    try {
      const data = { day, userExercise };
      const resp = await axios.put("/api/SaveWorkout", data);
      setShowPopup(false);
      router.push("/schedule");
    } catch (error) {
      console.error("Error creating product:", error);
      setError("Failed to create product. Please try again later.");
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
        <input
          type="text"
          name="ExerciseId"
          value={userExercise.exerciseId}
          className="hidden"
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
        <input
          type="number"
          name="Sets"
          min="0"
          placeholder={"Number of Sets"}
          value={userExercise.numberOfSets}
          onChange={handleSetsChange}
          className="p-4 py-2"
        />

        {userExercise.numberOfSets > 0 && (
          <div className="flex flex-col gap-2 w-full">
            <Typography variant="body2">Target reps for each set</Typography>
            {Array.from({ length: userExercise.numberOfSets }).map((_, i) => (
              <input
                key={i}
                type="number"
                min="0"
                placeholder={`Set ${i + 1} target reps`}
                value={userExercise.targetReps[i] ?? 0}
                onChange={(e) => handleTargetRepChange(i, e.target.value)}
                className="p-4 py-2 w-full"
              />
            ))}
          </div>
        )}

        <Button
          onClick={saveUserExercise}
          variant="contained"
          color="error"
          className="place-self-center"
        >
          Add
        </Button>
      </div>
    </div>
  );
};

export default AddExeForm;
