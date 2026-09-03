"use client";
import { useState, useEffect, useCallback } from "react";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/app/api/Authprovider/Authprovider";

// The auth guard lives in the hook, not at each call site — the same reason
// useProgress owns its own useAuth().
export const useBodyWeight = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const res = await apiClient.get("/api/bodyweight");
      setData(res.data);
      setError("");
    } catch (err) {
      console.error("Error loading weight history:", err);
      setError("Couldn't load your weight history.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, error, loading, reload: load };
};
