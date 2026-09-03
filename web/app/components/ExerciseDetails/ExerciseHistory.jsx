"use client";
import React from "react";
import { Typography } from "@mui/material";
import TimeSeriesChart from "@/app/components/charts/TimeSeriesChart";
import { useExerciseHistory } from "@/lib/useHistory";
import { cardClass } from "@/lib/styles";

const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

const FEEL_LABELS = {
  easy: "Easy",
  just_right: "Just right",
  struggled: "Struggled",
};

const Stat = ({ label, value, sub }) => (
  <div>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <div className="text-2xl font-semibold leading-tight">{value}</div>
    {sub && (
      <Typography variant="caption" color="text.secondary">
        {sub}
      </Typography>
    )}
  </div>
);

const ExerciseHistory = ({ exerciseId }) => {
  const { data, loading, error, signedIn } = useExerciseHistory(exerciseId);

  if (!signedIn) return null;

  if (loading) {
    return (
      <section className="mt-16">
        <div className={`${cardClass} p-5 h-64 animate-pulse`} />
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt-16">
        <Typography color="error">{error}</Typography>
      </section>
    );
  }

  const unit = data?.unit || "kg";
  const hasHistory = (data?.totalSessions || 0) > 0;

  return (
    <section className="mt-16">
      <Typography variant="h5" className="mb-5">
        Your history
      </Typography>

      {!hasHistory ? (
        <div className={`${cardClass} p-8 text-center`}>
          <Typography variant="body1">
            You haven&apos;t logged this one yet.
          </Typography>
          <Typography variant="body2" color="text.secondary" className="mt-1">
            Add it to your schedule and log a session — this is where the
            numbers will show up.
          </Typography>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className={`${cardClass} p-5`}>
            <div className="flex flex-wrap gap-x-10 gap-y-4 mb-5">
              {data.usesWeight && (
                <Stat
                  label="Heaviest set"
                  value={`${data.best.topSet} ${unit}`}
                  sub={formatDate(data.best.topSetDate)}
                />
              )}
              <Stat
                label="Most reps in a set"
                value={data.best.mostReps ?? "—"}
                sub={formatDate(data.best.mostRepsDate)}
              />
              {data.usesWeight && data.best.oneRepMax && (
                <Stat
                  label="Best estimated 1RM"
                  value={`${data.best.oneRepMax} ${unit}`}
                  sub="Epley estimate"
                />
              )}
              <Stat
                label="Sessions logged"
                value={data.totalSessions}
                sub={data.totalSessions === 1 ? "session" : "sessions"}
              />
            </div>

            <Typography variant="body2" color="text.secondary" className="mb-2">
              {data.usesWeight
                ? `Heaviest set per session (${unit})`
                : "Total reps per session"}
            </Typography>
            <TimeSeriesChart
              points={data.chart}
              unit={data.usesWeight ? unit : "reps"}
              emptyMessage="Not enough sessions to plot yet."
            />
          </div>

          <div className={`${cardClass} p-5`}>
            <Typography variant="body2" color="text.secondary" className="mb-3">
              Recent sessions
            </Typography>
            <div className="flex flex-col gap-3">
              {data.sessions.slice(0, 8).map((session) => (
                <div
                  key={session.date}
                  className="flex items-start justify-between gap-4 flex-wrap"
                >
                  <div className="min-w-[9rem]">
                    <div className="text-sm">{formatDate(session.date)}</div>
                    <Typography variant="caption" color="text.secondary">
                      {session.setCount} sets · {session.reps} reps
                      {session.feel && ` · ${FEEL_LABELS[session.feel]}`}
                      {session.unplanned && " · extra"}
                    </Typography>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {session.sets.map((set) => (
                      <span
                        key={set.setNumber}
                        className="text-xs px-2 py-1 rounded-md bg-muted"
                        title={
                          set.targetReps
                            ? `Target ${set.targetReps} reps`
                            : undefined
                        }
                      >
                        {set.weight
                          ? `${set.reps} × ${set.weight}${unit}`
                          : `${set.reps} reps`}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ExerciseHistory;
