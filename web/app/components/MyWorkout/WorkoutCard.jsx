"use client";
import React from "react";
import styled from "styled-components";
import { Button, Typography, Chip } from "@mui/material";
import { useDraggable } from "@dnd-kit/core";

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: 0.5fr 1.5fr;
  gap: 10px;
  background-color: "#F8D8D6";
  width: auto;
  padding: 10px;
  border-radius: 10px;
`;

const statusColor = {
  incomplete: "default",
  partial: "warning",
  completed: "success",
};

const WorkoutCard = ({ exercise, onLog, onEdit }) => {
  const draggable = exercise.status === "incomplete";
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: exercise._id,
    disabled: !draggable,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 10,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(draggable ? { ...attributes, ...listeners } : {})}
      className="bg-mybg mb-2 gap-5"
    >
      <CardGrid className="bg-mybg mb-2 gap-5">
        <div className="flex justify-center items-center">
          <img
            src={exercise.exerciseGif}
            alt={exercise.exerciseName}
            className="rounded-md"
          />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <Typography textTransform={"capitalize"}>
              {exercise.exerciseName}
            </Typography>
            <Chip
              label={exercise.status}
              color={statusColor[exercise.status]}
              size="small"
            />
          </div>
          <Typography>Sets - {exercise.numberOfSets}</Typography>
          <Typography>
            Targets -{" "}
            {Array.isArray(exercise.targetReps)
              ? exercise.targetReps.join(", ")
              : "not set"}
          </Typography>
          <div className="flex gap-2 justify-end">
            {exercise.status === "incomplete" ? (
              <Button
                type="button"
                onClick={() => onLog(exercise)}
                className="bg-white rounded-lg"
              >
                Log Sets
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => onEdit(exercise)}
                className="bg-white rounded-lg"
              >
                Edit
              </Button>
            )}
          </div>
        </div>
      </CardGrid>
    </div>
  );
};

export default WorkoutCard;
