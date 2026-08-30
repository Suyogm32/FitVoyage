"use client";
import { useState, useEffect } from "react";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/app/api/Authprovider/Authprovider";

// Returns suggestions keyed by exerciseId. Empty object when coach mode is
// off or the request fails — callers render nothing rather than breaking.
export const useCoachSuggestions = ({ date, day, refreshTrigger }) => {
  const { user, loading } = useAuth();
  const [suggestions, setSuggestions] = useState({});

  useEffect(() => {
    if (loading || !user || !date || !day) return;

    let cancelled = false;
    apiClient
      .get("/api/coach/suggest", { params: { date, day } })
      .then((res) => {
        if (cancelled) return;
        const byExerciseId = {};
        for (const suggestion of res.data.suggestions || []) {
          byExerciseId[suggestion.exerciseId] = suggestion;
        }
        setSuggestions(byExerciseId);
      })
      .catch(() => {
        if (!cancelled) setSuggestions({});
      });

    return () => {
      cancelled = true;
    };
  }, [user, loading, date, day, refreshTrigger]);

  return suggestions;
};
