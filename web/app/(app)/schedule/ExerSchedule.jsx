"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Typography, TextField } from "@mui/material";
import { Pencil } from "lucide-react";
import ScheduleExerciseCard from "./ScheduleExerciseCard";
import apiClient from "@/lib/apiClient";
import { cardClass } from "@/lib/styles";
import { useDayFocus, describeDay } from "@/lib/useDayFocus";

const ExerSchedule = ({ updateTrigger }) => {
  const [schedule, setSchedule] = useState({});
  const [error, setError] = useState(null);
  const [editingDay, setEditingDay] = useState(null);
  const [draftFocus, setDraftFocus] = useState("");
  const { dayFocus, saveFocus } = useDayFocus();

  const fetchSchedule = async () => {
    try {
      const response = await apiClient.get("/api/myschedule");
      if (response.data && response.data[0]?.schedule) {
        setSchedule(response.data[0].schedule);
        setError(null);
      } else {
        setSchedule({});
        setError("No Schedule Available!");
      }
    } catch (error) {
      console.error("Error fetching schedule:", error);
      setError("Failed to load schedule. Please try again later.");
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, [updateTrigger]);

  const startEdit = (day) => {
    setEditingDay(day);
    setDraftFocus(dayFocus[day] || "");
  };

  const commitEdit = async (day) => {
    try {
      await saveFocus(day, draftFocus);
    } catch (err) {
      console.error("Error saving day focus:", err);
    } finally {
      setEditingDay(null);
    }
  };

  const totalExercises = Object.values(schedule || {}).reduce(
    (total, day) => total + (day?.length || 0),
    0,
  );

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  return (
    <div className="w-full">
      {totalExercises === 0 && (
        <div
          className={`${cardClass} p-4 mb-4 flex items-center justify-between gap-4 flex-wrap`}
        >
          <Typography variant="body2">
            Nothing scheduled yet — let the AI coach build you a program.
          </Typography>
          <Link
            href="/program"
            className="text-sm px-3 py-1.5 rounded-lg"
            style={{
              backgroundColor: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
            }}
          >
            Build my program
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Object.keys(schedule || {}).map((day) => {
          const exercises = schedule[day] || [];
          const label = describeDay(dayFocus[day], exercises.length);
          return (
            <div key={day} className={`${cardClass} p-4`}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-lg font-medium text-muted-foreground">
                  {day.toUpperCase()}
                </h3>
                {editingDay === day ? (
                  <TextField
                    size="small"
                    autoFocus
                    placeholder="e.g. chest, push day"
                    value={draftFocus}
                    onChange={(e) => setDraftFocus(e.target.value)}
                    onBlur={() => commitEdit(day)}
                    onKeyDown={(e) => e.key === "Enter" && commitEdit(day)}
                    sx={{ flex: 1 }}
                  />
                ) : (
                  <button
                    onClick={() => startEdit(day)}
                    className="flex items-center gap-1 text-sm hover:opacity-70"
                    aria-label={`Set focus for ${day}`}
                  >
                    <span className="capitalize">{label || "Add focus"}</span>
                    <Pencil size={12} />
                  </button>
                )}
              </div>

              {exercises.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {exercises.map((exercise) => (
                    <ScheduleExerciseCard
                      key={exercise._id}
                      exercise={exercise}
                      day={day}
                      onChanged={fetchSchedule}
                    />
                  ))}
                </div>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Nothing scheduled.
                </Typography>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExerSchedule;
