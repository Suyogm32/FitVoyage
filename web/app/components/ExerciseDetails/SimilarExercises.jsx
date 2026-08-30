"use client";
import React, { useState } from "react";
import { Typography } from "@mui/material";
import HorizontalScrollForExercises from "./HorizontalScrollForExercises";
import AddExercise from "@/app/AddExercise/AddExercise";

const Section = ({ label, highlight, exercises, setAddExer }) => {
  if (!exercises?.length) return null;
  return (
    <section className="mb-12">
      <Typography variant="h5" className="mb-5">
        {label}{" "}
        <span style={{ color: "hsl(var(--primary))" }}>{highlight}</span>{" "}
        Exercises
      </Typography>
      <HorizontalScrollForExercises
        exerciseData={exercises}
        setAddExer={setAddExer}
      />
    </section>
  );
};

const SimilarExercises = ({ targetMuscleExercises, equipmentExercises }) => {
  // The rails render ExerciseCard, whose "+" calls setAddExer. It was never
  // passed down here, so clicking it threw.
  const [addExer, setAddExer] = useState(null);

  return (
    <div className="mt-16">
      <Section
        label="Similar"
        highlight="Target Muscle"
        exercises={targetMuscleExercises}
        setAddExer={setAddExer}
      />
      <Section
        label="Similar"
        highlight="Equipment"
        exercises={equipmentExercises}
        setAddExer={setAddExer}
      />

      {addExer && (
        <AddExercise exerc={addExer} setShowPopup={() => setAddExer(null)} />
      )}
    </div>
  );
};

export default SimilarExercises;
