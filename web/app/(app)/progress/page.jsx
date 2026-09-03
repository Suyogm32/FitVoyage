"use client";
import React, { useState } from "react";
import { Typography } from "@mui/material";
import ProgressOverview from "@/app/components/MyWorkout/ProgressOverview";
import WeeklyProgress from "@/app/components/MyWorkout/WeeklyProgress";
import BodyWeightCard from "@/app/components/progress/BodyWeightCard";
import VolumeCard from "@/app/components/progress/VolumeCard";
import { useProgress } from "@/lib/useProgress";
import { useUserProfile } from "@/lib/useUserProfile";

const ProgressPage = () => {
  const [range, setRange] = useState("month");
  const [goalsVersion, setGoalsVersion] = useState(0);
  const { stats, error } = useProgress({ range, refreshTrigger: goalsVersion });
  const { profile } = useUserProfile();

  const advancedStats = Boolean(profile?.advancedStats);

  return (
    <div className="flex flex-col gap-8">
      {error && <Typography color="error">{error}</Typography>}
      <ProgressOverview
        stats={stats}
        range={range}
        onRangeChange={setRange}
        onGoalsSaved={() => setGoalsVersion((v) => v + 1)}
      />
      <BodyWeightCard />
      {/* Rendered only when opted in, and the hook skips its request too —
          an off toggle shouldn't still cost a round trip. */}
      {advancedStats && <VolumeCard enabled={advancedStats} />}
      <WeeklyProgress currentWeek={stats?.currentWeek} />
    </div>
  );
};

export default ProgressPage;
