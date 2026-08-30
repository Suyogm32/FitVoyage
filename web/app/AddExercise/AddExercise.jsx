"use client";
import React from "react";
import SidePanel from "@/app/components/SidePanel";
import AddExeForm from "./AddExeForm";

const AddExercise = ({ exerc, setShowPopup, onScheduleChange }) => (
  <SidePanel
    title="Add to your schedule"
    subtitle={exerc?.name}
    onClose={() => setShowPopup(false)}
  >
    <AddExeForm
      exercise={exerc}
      setShowPopup={setShowPopup}
      onScheduleChange={onScheduleChange}
    />
  </SidePanel>
);

export default AddExercise;
