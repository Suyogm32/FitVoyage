"use client";
import React, { useState } from "react";
import { Typography } from "@mui/material";
import ProgressOverview from "@/app/components/MyWorkout/ProgressOverview";
import WeeklyProgress from "@/app/components/MyWorkout/WeeklyProgress";
import { useProgress } from "@/lib/useProgress";

const ProgressPage = () => {
  const [range, setRange] = useState("month");
  const [goalsVersion, setGoalsVersion] = useState(0);
  const { stats, error } = useProgress({ range, refreshTrigger: goalsVersion });

  return (
    <div className="flex flex-col gap-8">
      {error && <Typography color="error">{error}</Typography>}
      <ProgressOverview
        stats={stats}
        range={range}
        onRangeChange={setRange}
        onGoalsSaved={() => setGoalsVersion((v) => v + 1)}
      />
      <WeeklyProgress currentWeek={stats?.currentWeek} />
    </div>
  );
};

export default ProgressPage;
