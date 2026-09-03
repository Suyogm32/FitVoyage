"use client";
import React, { useState, useEffect } from "react";
import { Button, Typography } from "@mui/material";
import apiClient from "@/lib/apiClient";
import SidePanel from "@/app/components/SidePanel";

const SubstitutePanel = ({ exercise, onPick, onClose }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get(`/api/coach/substitutes/${exercise.exerciseId}`)
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load substitutes:", err);
        setError("Couldn't find alternatives right now.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [exercise.exerciseId]);

  const substitutes = data?.substitutes || [];

  return (
    <SidePanel
      title="Swap this exercise"
      subtitle={exercise.exerciseName}
      onClose={onClose}
      footer={<Button onClick={onClose}>Cancel</Button>}
    >
      <Typography variant="body2" color="text.secondary" className="mb-4">
        Same muscles, different equipment — for when the machine&apos;s taken or
        the movement isn&apos;t working today. You&apos;ll keep the same sets
        and rep targets, and this still counts as completing{" "}
        {exercise.exerciseName}.
      </Typography>

      {error && <Typography color="error">{error}</Typography>}

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : substitutes.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No alternatives match the equipment in your training profile. Adding
          more equipment in Settings will widen this.
        </Typography>
      ) : (
        <div className="flex flex-col gap-2">
          {substitutes.map((option) => (
            <button
              key={option.id}
              onClick={() => onPick(exercise, option)}
              className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted text-left w-full"
            >
              <img
                src={option.gifUrl}
                alt=""
                loading="lazy"
                className="w-14 h-14 rounded-md bg-white shrink-0 object-cover"
              />
              <div className="min-w-0">
                <div className="capitalize font-medium leading-snug">
                  {option.name}
                </div>
                {/* Why this one, in the app's own words. A ranked list with no
                    reasoning is just a list. */}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  className="block"
                >
                  {option.reasons.join(" · ")}
                </Typography>
              </div>
            </button>
          ))}
        </div>
      )}
    </SidePanel>
  );
};

export default SubstitutePanel;
