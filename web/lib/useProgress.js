"use client";
import { useState, useEffect } from "react";
import dayjs from "dayjs";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/app/api/Authprovider/Authprovider";

// Single source for /api/progress data — the dashboard is split across two
// places on the myworkout page, so one fetch feeds both.
export const useProgress = ({ referenceDate, refreshTrigger, range } = {}) => {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // Wait for Firebase to resolve the session — apiClient's interceptor
    // reads auth.currentUser, which is null while auth is still loading.
    if (loading || !user) return;

    let cancelled = false;
    const params = {};
    if (referenceDate) params.date = dayjs(referenceDate).format("DD/MM/YY");
    if (range) params.range = range;

    apiClient
      .get("/api/progress", { params })
      .then((res) => {
        if (cancelled) return;
        setStats(res.data);
        setError("");
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load your progress right now.");
      });

    return () => {
      cancelled = true;
    };
  }, [user, loading, referenceDate, refreshTrigger, range]);

  return { stats, error };
};
