"use client";
import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { Typography } from "@mui/material";

const WorkoutColumn = ({ id, title, children }) => {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`border-black w-auto bg-white mt-8 rounded-lg p-4 flex-1 min-h-[200px] transition-colors ${
        isOver ? "bg-green-50" : ""
      }`}
    >
      <Typography variant="h5" sx={{ mb: 2 }}>
        {title}
      </Typography>
      {children}
    </div>
  );
};

export default WorkoutColumn;
