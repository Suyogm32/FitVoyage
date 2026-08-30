"use client";
import { useState, useEffect, useCallback } from "react";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/app/api/Authprovider/Authprovider";

export const useDayFocus = () => {
  const { user, loading } = useAuth();
  const [dayFocus, setDayFocus] = useState({});

  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    apiClient
      .get("/api/myschedule/focus")
      .then((res) => {
        if (!cancelled) setDayFocus(res.data?.dayFocus || {});
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  const saveFocus = useCallback(async (day, focus) => {
    const { data } = await apiClient.patch("/api/saveworkout/focus", {
      day,
      focus,
    });
    setDayFocus(data?.dayFocus || {});
  }, []);

  return { dayFocus, saveFocus };
};

// A day with no exercises is a rest day — derived rather than stored, so it
// can never disagree with the actual schedule.
export const describeDay = (focus, exerciseCount) => {
  if (!exerciseCount) return "Rest day";
  return focus || "";
};
