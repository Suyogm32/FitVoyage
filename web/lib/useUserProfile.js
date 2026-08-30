"use client";
import { useState, useEffect, useCallback } from "react";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/app/api/Authprovider/Authprovider";

// Shared profile fetch. Auth guard lives inside for the same reason
// useProgress has one — a guard every caller must remember is a guard
// someone eventually forgets.
export const useUserProfile = () => {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    apiClient
      .get("/api/user")
      .then((res) => {
        if (cancelled) return;
        setProfile(res.data);
        setError("");
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load your settings.");
      });
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  const updateProfile = useCallback(async (changes) => {
    const res = await apiClient.patch("/api/user", changes);
    setProfile(res.data);
    return res.data;
  }, []);

  return { profile, error, updateProfile };
};
