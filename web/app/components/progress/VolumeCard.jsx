"use client";
import React from "react";
import { Typography } from "@mui/material";
import TimeSeriesChart from "@/app/components/charts/TimeSeriesChart";
import { useVolume } from "@/lib/useHistory";
import { cardClass } from "@/lib/styles";

const VolumeCard = ({ weeks = 12, enabled = true }) => {
  const { data, loading, error } = useVolume(weeks, enabled);

  const unit = data?.unit || "kg";
  const weeksData = data?.weeks || [];
  const latest = weeksData[weeksData.length - 1];
  const previous = weeksData[weeksData.length - 2];

  const change =
    latest && previous && previous.volume > 0
      ? Math.round(((latest.volume - previous.volume) / previous.volume) * 100)
      : null;

  const maxBodyPart = Math.max(
    1,
    ...(latest?.byBodyPart || []).map((row) => row.volume),
  );

  return (
    <section>
      <Typography variant="h6" className="mb-3">
        Training volume
      </Typography>

      <div className={`${cardClass} p-5`}>
        {error && <Typography color="error">{error}</Typography>}

        <div className="flex items-baseline gap-4 mb-4 flex-wrap">
          <div className="flex items-baseline gap-1.5">
            <span
              className="text-4xl font-bold leading-none"
              style={{ color: "hsl(var(--primary))" }}
            >
              {loading ? "—" : (latest?.volume ?? 0).toLocaleString()}
            </span>
            <span className="text-sm text-muted-foreground">
              {unit} this week
            </span>
          </div>
          {change !== null && (
            <span className="text-sm text-muted-foreground">
              {change > 0 ? "+" : ""}
              {change}% vs last week
            </span>
          )}
          {latest && (
            <span className="text-sm text-muted-foreground ml-auto">
              {latest.sets} sets · {latest.reps} reps
            </span>
          )}
        </div>

        <TimeSeriesChart
          points={weeksData.map((week) => ({
            date: week.weekStart,
            value: week.volume,
          }))}
          unit={unit}
          emptyMessage={
            loading ? "Loading…" : "Log some weighted sets to see volume."
          }
        />

        {latest?.byBodyPart?.length > 0 && (
          <div className="mt-5 pt-5 border-t border-border">
            <Typography variant="body2" color="text.secondary" className="mb-3">
              This week by body part
            </Typography>
            <div className="flex flex-col gap-2">
              {latest.byBodyPart.map((row) => (
                <div key={row.bodyPart} className="flex items-center gap-3">
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    textTransform="capitalize"
                    className="w-24 shrink-0"
                  >
                    {row.bodyPart}
                  </Typography>
                  <div className="flex-1 bg-muted rounded h-4 overflow-hidden">
                    <div
                      className="h-full rounded"
                      style={{
                        width: `${(row.volume / maxBodyPart) * 100}%`,
                        backgroundColor: "hsl(var(--primary) / 0.7)",
                      }}
                    />
                  </div>
                  <Typography
                    variant="body2"
                    className="w-24 text-right shrink-0"
                  >
                    {row.volume.toLocaleString()} {unit}
                  </Typography>
                </div>
              ))}
            </div>
          </div>
        )}

        <Typography
          variant="caption"
          color="text.secondary"
          className="block mt-4"
        >
          Volume is sets × reps × load. Bodyweight work isn&apos;t counted here
          — it shows in the sets and reps figures instead.
        </Typography>
      </div>
    </section>
  );
};

export default VolumeCard;
