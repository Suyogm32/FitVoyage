"use client";
import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { Typography } from "@mui/material";

const WorkoutColumn = ({ id, title, action, children }) => {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`border-black w-auto bg-white mt-8 rounded-lg p-4 flex-1 min-h-[200px] transition-colors ${
        isOver ? "bg-green-50" : ""
      }`}
    >
      <div className="flex justify-between items-center gap-2 mb-4">
        <Typography variant="h5">{title}</Typography>
        {action}
      </div>
      {children}
    </div>
  );
};

export default WorkoutColumn;