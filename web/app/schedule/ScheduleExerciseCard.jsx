import React, { useState } from "react";
import styled from "styled-components";
import { Button, Typography } from "@mui/material";
import axios from "axios";

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: 0.5fr 1.5fr;
  gap: 10px;
  background-color: "#F8D8D6";
  width: auto;
  padding: 10px;
  border-radius: 10px;
`;

const ScheduleExerciseCard = ({ exercise, day, onRemoved }) => {
  const [removing, setRemoving] = useState(false);

  const removeExercise = async () => {
    setRemoving(true);
    try {
      await axios.delete("/api/SaveWorkout", {
        data: { day, exerciseEntryId: exercise._id },
      });
      if (onRemoved) onRemoved();
    } catch (error) {
      console.error("Error removing exercise:", error);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <CardGrid className="bg-mybg mb-2 gap-5">
      <div className="flex justify-center items-center">
        <img
          src={exercise.exerciseGif}
          alt={exercise.exerciseName}
          className="rounded-md"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Typography textTransform={"capitalize"}>
          {exercise.exerciseName}
        </Typography>
        <Typography>Sets - {exercise.numberOfSets}</Typography>
        <div className="flex gap-8 justify-between items-center">
          <Typography>
            Targets -{" "}
            {Array.isArray(exercise.targetReps)
              ? exercise.targetReps.join(", ")
              : "not set"}
          </Typography>
          <Button
            className="place-self-end"
            onClick={removeExercise}
            disabled={removing}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="red"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </Button>
        </div>
      </div>
    </CardGrid>
  );
};

export default ScheduleExerciseCard;
