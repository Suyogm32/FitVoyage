"use client";
import React from "react";
import { Typography } from "@mui/material";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

const cardClass = "bg-card rounded-xl shadow-sm border border-black/5";
const textMuted = { color: "hsl(var(--muted-foreground))" };

const DAY_LABELS = {
  sun: "Sun",
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
};

const ordinal = (n) => {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
};

// "16th – 22nd Aug 2026", or "30th Aug – 5th Sep 2026" when the week
// straddles two months.
const formatWeekRange = (startStr, endStr) => {
  const start = dayjs(startStr, "DD/MM/YY");
  const end = dayjs(endStr, "DD/MM/YY");
  if (!start.isValid() || !end.isValid()) return "";
  const sameMonth =
    start.month() === end.month() && start.year() === end.year();
  if (sameMonth) {
    return `${ordinal(start.date())} – ${ordinal(end.date())} ${end.format("MMM YYYY")}`;
  }
  return `${ordinal(start.date())} ${start.format("MMM")} – ${ordinal(end.date())} ${end.format("MMM YYYY")}`;
};

const WeeklyProgress = ({ currentWeek }) => {
  if (!currentWeek) return null;

  const { weekStart, weekEnd, completed, scheduled, days } = currentWeek;

  return (
    <div className={`${cardClass} p-5 w-full`}>
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <Typography variant="h6">
          {formatWeekRange(weekStart, weekEnd)}
        </Typography>
        <Typography variant="body2" sx={textMuted}>
          {completed} / {scheduled} completed this week
        </Typography>
      </div>

      <div className="flex flex-col gap-2.5">
        {days.map((day) => {
          const pct =
            day.scheduled > 0 ? (day.completed / day.scheduled) * 100 : 0;
          const isRestDay = day.scheduled === 0;
          return (
            <div key={day.date} className="flex items-center gap-3">
              <Typography
                variant="body2"
                sx={textMuted}
                className="w-10 shrink-0"
              >
                {DAY_LABELS[day.dayKey]}
              </Typography>
              <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: "hsl(var(--primary))",
                  }}
                />
              </div>
              <Typography
                variant="body2"
                sx={isRestDay ? textMuted : undefined}
                className="w-32 text-right shrink-0"
              >
                {isRestDay
                  ? "Rest day"
                  : `${day.completed} of ${day.scheduled} completed`}
              </Typography>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyProgress;
