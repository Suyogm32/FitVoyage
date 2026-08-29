"use client";
import React, { useState } from "react";
import { Typography, Button } from "@mui/material";
import GoalsModal from "./GoalsModal";

const textMuted = { color: "hsl(var(--muted-foreground))" };
const cardClass = "bg-card rounded-xl shadow-sm border border-black/5";

const RANGES = [
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];

const heatmapColor = (day) => {
  if (!day.hasWorkout) return "hsl(var(--muted))";
  if (day.totalReps < 20) return "hsl(var(--primary) / 0.45)";
  if (day.totalReps < 60) return "hsl(var(--primary) / 0.75)";
  return "hsl(var(--primary))";
};

const describePR = (pr) => {
  if (pr.type === "weight") {
    return {
      headline: `${pr.value} kg × ${pr.reps}`,
      delta: `+${Math.round((pr.value - pr.previous) * 10) / 10} kg`,
      label: "Heaviest set",
    };
  }
  if (pr.type === "oneRepMax") {
    return {
      headline: `${pr.value} kg est. 1RM`,
      delta: `+${Math.round((pr.value - pr.previous) * 10) / 10} kg`,
      label: "Best estimated 1RM",
    };
  }
  return {
    headline: `${pr.value} reps`,
    delta: `+${pr.value - pr.previous} reps`,
    label: "Most reps in a set",
  };
};

const RADIUS = 46;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const CompletionRing = ({ rate }) => {
  const pct = rate ?? 0;
  const offset = CIRCUMFERENCE * (1 - pct / 100);
  return (
    <svg
      width="128"
      height="128"
      viewBox="0 0 128 128"
      role="img"
      aria-label={`${pct}% completion rate`}
    >
      <circle
        cx="64"
        cy="64"
        r={RADIUS}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth="13"
      />
      <circle
        cx="64"
        cy="64"
        r={RADIUS}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="13"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        transform="rotate(-90 64 64)"
      />
      <text
        x="64"
        y="62"
        textAnchor="middle"
        style={{ fontSize: 26, fontWeight: 500, fill: "currentColor" }}
      >
        {rate === null ? "—" : `${pct}%`}
      </text>
      <text
        x="64"
        y="82"
        textAnchor="middle"
        style={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
      >
        completed
      </text>
    </svg>
  );
};

const ProgressOverview = ({ stats, range, onRangeChange, onGoalsSaved }) => {
  if (!stats) return null;

  const recentPRs = stats.recentPRs || [];
  const muscleGroups = stats.muscleGroups || [];
  const maxSets = Math.max(1, ...muscleGroups.map((m) => m.sets));
  const rangeLabel =
    RANGES.find((r) => r.key === range)?.label.toLowerCase() || "month";
  const [showGoals, setShowGoals] = useState(false);

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex gap-2">
        {RANGES.map((r) => (
          <Button
            key={r.key}
            size="small"
            variant={range === r.key ? "contained" : "outlined"}
            color="error"
            onClick={() => onRangeChange(r.key)}
          >
            {r.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${cardClass} p-5 flex items-center gap-5`}>
          <CompletionRing rate={stats.completionRate} />
          <div>
            <Typography variant="body2" sx={textMuted}>
              Last {rangeLabel}
            </Typography>
            <Typography variant="h6">
              {stats.completionRate === null
                ? "Nothing logged yet"
                : "of exercises hit their target"}
            </Typography>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Current streak"
            value={`${stats.currentStreak}`}
            unit="days"
          />
          <StatCard
            label="Longest streak"
            value={`${stats.longestStreak}`}
            unit="days"
          />
          <StatCard
            label={`PRs this ${rangeLabel}`}
            value={`${stats.prCount ?? 0}`}
            unit={stats.prCount === 1 ? "record" : "records"}
          />
        </div>
      </div>

      <section>
        <div className="flex justify-between items-center mb-3">
          <Typography variant="h6">Sets per muscle group</Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setShowGoals(true)}
          >
            Set goals
          </Button>
        </div>
        <div className={`${cardClass} p-4`}>
          {muscleGroups.length === 0 ? (
            <Typography variant="body2" sx={textMuted}>
              Nothing logged in this range yet.
            </Typography>
          ) : (
            <div className="flex flex-col gap-3">
              {muscleGroups.map((group) => {
                const hasGoal = group.targetSets > 0;
                // Against a goal the bar reads as progress; without one it's
                // relative to your biggest muscle group, which is all the
                // comparison available.
                const pct = hasGoal
                  ? Math.min(100, (group.sets / group.targetSets) * 100)
                  : (group.sets / maxSets) * 100;
                return (
                  <div key={group.bodyPart} className="flex items-center gap-3">
                    <Typography
                      variant="body2"
                      sx={textMuted}
                      textTransform="capitalize"
                      className="w-24 shrink-0"
                    >
                      {group.bodyPart}
                    </Typography>
                    <div className="flex-1 bg-muted rounded h-5 overflow-hidden">
                      <div
                        className="h-full rounded"
                        style={{
                          width: `${pct}%`,
                          backgroundColor:
                            hasGoal && group.sets >= group.targetSets
                              ? "hsl(var(--primary))"
                              : "hsl(var(--primary) / 0.65)",
                        }}
                      />
                    </div>
                    <Typography
                      variant="body2"
                      className="w-20 text-right shrink-0"
                    >
                      {hasGoal
                        ? `${group.sets} / ${group.targetSets}`
                        : group.sets}
                    </Typography>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section>
        <Typography variant="h6" className="mb-3">
          Recent personal records
        </Typography>
        <div className={`${cardClass} p-4`}>
          {recentPRs.length === 0 ? (
            <Typography variant="body2" sx={textMuted}>
              No records yet. The first time you log an exercise sets your
              baseline — beat it on a later session and it shows up here.
            </Typography>
          ) : (
            <div className="flex flex-col gap-3">
              {recentPRs.map((pr) => {
                const { headline, delta, label } = describePR(pr);
                return (
                  <div
                    key={`${pr.exercise_ID}-${pr.date}-${pr.type}`}
                    className="flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <Typography textTransform="capitalize" noWrap>
                        {pr.exerciseName}
                      </Typography>
                      <Typography variant="body2" sx={textMuted}>
                        {label} · {pr.date}
                      </Typography>
                    </div>
                    <Typography variant="body2" className="shrink-0">
                      {headline}
                    </Typography>
                    <span
                      className="shrink-0 text-xs px-2 py-1 rounded-md"
                      style={{
                        backgroundColor: "hsl(var(--primary) / 0.12)",
                        color: "hsl(var(--primary))",
                      }}
                    >
                      {delta}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <section>
          <Typography variant="h6" className="mb-3">
            Consistency — last 12 weeks
          </Typography>
          <div className={`${cardClass} p-4`}>
            <div className="flex flex-wrap gap-1.5">
              {stats.consistency.map((day) => (
                <div
                  key={day.date}
                  title={`${day.date}${day.hasWorkout ? ` — ${day.totalReps} reps` : ""}`}
                  className="w-4 h-4 rounded-sm"
                  style={{ backgroundColor: heatmapColor(day) }}
                />
              ))}
            </div>
          </div>
        </section>

        <section>
          <Typography variant="h6" className="mb-3">
            Most-worked exercises
          </Typography>
          {stats.topExercises.length === 0 ? (
            <Typography variant="body2" sx={textMuted}>
              Nothing logged in this range yet.
            </Typography>
          ) : (
            <div className="flex flex-col gap-2">
              {stats.topExercises.map((ex) => (
                <div
                  key={ex.exercise_ID}
                  className={`${cardClass} flex justify-between items-center gap-4 p-3`}
                >
                  <Typography textTransform="capitalize">
                    {ex.exerciseName}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={textMuted}
                    className="shrink-0"
                  >
                    {ex.sessions} sessions · {ex.totalReps} reps
                  </Typography>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      {showGoals && (
        <GoalsModal
          weeklyGoals={stats.weeklyGoals || []}
          onClose={() => setShowGoals(false)}
          onSaved={onGoalsSaved}
        />
      )}
    </div>
  );
};

const StatCard = ({ label, value, unit }) => (
  <div className={`${cardClass} p-5`}>
    <Typography variant="body2" sx={textMuted}>
      {label}
    </Typography>
    <div className="flex items-baseline gap-1 mt-1">
      <span
        className="text-4xl font-bold leading-none"
        style={{ color: "hsl(var(--primary))" }}
      >
        {value}
      </span>
      {unit && (
        <span className="text-sm" style={textMuted}>
          {unit}
        </span>
      )}
    </div>
  </div>
);

export default ProgressOverview;
