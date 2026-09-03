"use client";
import { useState, useEffect, useCallback } from "react";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/app/api/Authprovider/Authprovider";

export const useDeloadAdvisory = (enabled = true) => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user || !enabled) {
      setLoading(false);
      return;
    }
    try {
      const res = await apiClient.get("/api/coach/advisory");
      setData(res.data);
    } catch (err) {
      // Advisory is a bonus, not a feature the page depends on. A failure
      // here shouldn't put an error banner above someone's workout.
      console.error("Failed to load advisory:", err);
    } finally {
      setLoading(false);
    }
  }, [user, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, reload: load };
};
