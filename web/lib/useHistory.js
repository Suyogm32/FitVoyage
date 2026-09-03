"use client";
import { useState, useEffect } from "react";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/app/api/Authprovider/Authprovider";

const useEndpoint = (url, enabled = true) => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // History is personal, so there's nothing to fetch for a signed-out
    // visitor reading an exercise page. Guard lives here, not at call sites.
    if (!user || !enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    apiClient
      .get(url)
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(`Failed to load ${url}:`, err);
        setError("Couldn't load your history.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [url, user, enabled]);

  return { data, loading, error, signedIn: Boolean(user) };
};

export const useExerciseHistory = (exerciseId) =>
  useEndpoint(`/api/history/exercise/${exerciseId}`, Boolean(exerciseId));

export const useVolume = (weeks = 12, enabled = true) =>
  useEndpoint(`/api/history/volume?weeks=${weeks}`, enabled);
