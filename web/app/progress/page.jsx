"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Typography } from "@mui/material";
import { useAuth } from "../api/Authprovider/Authprovider";
import Navbar from "../components/Navbar";
import ProgressOverview from "../components/MyWorkout/ProgressOverview";
import WeeklyProgress from "../components/MyWorkout/WeeklyProgress";
import { useProgress } from "@/lib/useProgress";

const ProgressPage = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [range, setRange] = useState("month");
  const { stats, error } = useProgress({ range });

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <div className="pb-16">
      <Navbar />
      <div className="px-6 pt-8 flex flex-col gap-8 max-w-6xl mx-auto">
        <Typography variant="h4">Your Progress</Typography>
        {error && <Typography color="error">{error}</Typography>}
        <ProgressOverview stats={stats} range={range} onRangeChange={setRange} />
        <WeeklyProgress currentWeek={stats?.currentWeek} />
      </div>
    </div>
  );
};

export default ProgressPage;