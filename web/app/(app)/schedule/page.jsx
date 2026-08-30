"use client";
import React, { useState, useCallback } from "react";
import SearchExercises from "@/app/components/homeComponents/SearchExercise/SearchExercises";
import ScheduleStack from "@/app/components/ScheduleComponent/ScheduleStack";
import ExerSchedule from "./ExerSchedule";

const page = () => {
  const [exercises, setExercises] = useState([]);
  const [updateTrigger, setUpdateTrigger] = useState(0);

  const triggerUpdate = useCallback(() => {
    setUpdateTrigger((prev) => prev + 1);
  }, []);

  return (
    <>
      <SearchExercises setExercises={setExercises} />
      <ScheduleStack
        exercises={exercises}
        setExercises={setExercises}
        onScheduleChange={triggerUpdate}
      />
      <ExerSchedule updateTrigger={updateTrigger} />
    </>
  );
};

export default page;
