"use client";
import React, { Suspense, useState, useCallback } from "react";
import ExerciseBrowser from "@/app/components/exercises/ExerciseBrowser";
import ExerSchedule from "./ExerSchedule";

const Page = () => {
  const [updateTrigger, setUpdateTrigger] = useState(0);

  const triggerUpdate = useCallback(() => {
    setUpdateTrigger((prev) => prev + 1);
  }, []);

  return (
    <div className="flex flex-col gap-8">
      {/* Same browser as /exercises, in compact mode: search only, results
          appear once you type. Replaces SearchExercises + ScheduleStack,
          which fetched the whole catalogue and paginated in the browser. */}
      <Suspense fallback={null}>
        <ExerciseBrowser compact onScheduleChange={triggerUpdate} />
      </Suspense>

      <ExerSchedule updateTrigger={updateTrigger} />
    </div>
  );
};

export default Page;
