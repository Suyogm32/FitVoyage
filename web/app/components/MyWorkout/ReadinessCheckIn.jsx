"use client";
import React, { useState, useEffect } from "react";
import { Typography, Button } from "@mui/material";
import apiClient from "@/lib/apiClient";

const cardClass = "bg-card rounded-xl shadow-sm border border-black/5";
const textMuted = { color: "hsl(var(--muted-foreground))" };

const OPTIONS = [
  { value: "fresh", label: "Fresh" },
  { value: "normal", label: "Normal" },
  { value: "beat_up", label: "Beat up" },
];

// One tap, once per session. Stands in for sleep + stress + soreness
// rather than asking three separate questions.
const ReadinessCheckIn = ({ date, day }) => {
  const [readiness, setReadiness] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    apiClient
      .get("/api/myschedule/readiness", { params: { date, day } })
      .then((res) => {
        if (cancelled) return;
        setReadiness(res.data.readiness);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [date, day]);

  const choose = async (value) => {
    if (saving) return;
    setSaving(true);
    try {
      await apiClient.post("/api/myschedule/readiness", {
        date,
        day,
        readiness: value,
      });
      setReadiness(value);
    } catch (error) {
      console.error("Error saving readiness:", error);
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  return (
    <div className={`${cardClass} p-4 flex items-center gap-4 flex-wrap`}>
      <Typography variant="body2" sx={textMuted} className="shrink-0">
        {readiness ? "Feeling today" : "How are you feeling today?"}
      </Typography>
      <div className="flex gap-2">
        {OPTIONS.map((option) => (
          <Button
            key={option.value}
            size="small"
            color="error"
            variant={readiness === option.value ? "contained" : "outlined"}
            disabled={saving}
            onClick={() => choose(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default ReadinessCheckIn;
