"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import styled from "styled-components";
import { Typography, TextField } from "@mui/material";
import { Pencil } from "lucide-react";
import ScheduleExerciseCard from "./ScheduleExerciseCard";
import apiClient from "@/lib/apiClient";
import { useDayFocus, describeDay } from "@/lib/useDayFocus";

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto;
  gap: 10px;
  width: 100%;
  padding: 10px;
  margin: auto;
  justify-content: center;
  align-content: start;
  justify-items: start;
  align-items: start;
  @media screen and (max-width: 1000px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media screen and (max-width: 600px) {
    grid-template-columns: repeat(1, 1fr);
  }
`;

const GridItem = styled.div`
  background-color: white;
  padding: 20px;
  font-size: 1.2em;
  border-radius: 5px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  width: 100%;
`;

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

  // An empty schedule is the exact moment the AI generator is most useful,
  // so the prompt lives here rather than only in the sidebar.
  const totalExercises = Object.values(schedule || {}).reduce(
    (total, day) => total + (day?.length || 0),
    0,
  );

  return (
    <div className="w-full">
      {!error && totalExercises === 0 && (
        <div className="bg-card rounded-xl shadow-sm border border-black/5 p-4 mb-4 flex items-center justify-between gap-4 flex-wrap">
          <Typography variant="body2">
            Nothing scheduled yet — let the AI coach build you a program.
          </Typography>
          <Link
            href="/program"
            className="text-sm px-3 py-1.5 rounded-lg text-white"
            style={{ backgroundColor: "hsl(var(--primary))" }}
          >
            Build my program
          </Link>
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
        }}
      >
        {error ? (
          <p style={{ color: "red" }}>{error}</p>
        ) : (
          <GridContainer className="items-center">
            {schedule && Object.keys(schedule).length > 0 ? (
              Object.keys(schedule).map((day) => {
                const exercises = schedule[day] || [];
                const label = describeDay(dayFocus[day], exercises.length);
                return (
                  <GridItem key={day} style={{ marginBottom: "20px" }}>
                    <div className="flex items-center gap-2 w-full mb-2">
                      <h3>{day.toUpperCase()}</h3>
                      {editingDay === day ? (
                        <TextField
                          size="small"
                          autoFocus
                          placeholder="e.g. chest, push day"
                          value={draftFocus}
                          onChange={(e) => setDraftFocus(e.target.value)}
                          onBlur={() => commitEdit(day)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && commitEdit(day)
                          }
                          sx={{ flex: 1 }}
                        />
                      ) : (
                        <button
                          onClick={() => startEdit(day)}
                          className="flex items-center gap-1 text-sm text-black/50 hover:text-black/80"
                          aria-label={`Set focus for ${day}`}
                        >
                          <span className="capitalize">
                            {label || "Add focus"}
                          </span>
                          <Pencil size={12} />
                        </button>
                      )}
                    </div>

                    <div>
                      {exercises.length > 0 ? (
                        <ul>
                          {exercises.map((exercise) => (
                            <li key={exercise._id}>
                              <ScheduleExerciseCard
                                exercise={exercise}
                                day={day}
                                onChanged={fetchSchedule}
                                className="gap-4"
                              />
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Nothing scheduled.
                        </Typography>
                      )}
                    </div>
                  </GridItem>
                );
              })
            ) : (
              <p>No schedule available.</p>
            )}
          </GridContainer>
        )}
      </div>
    </div>
  );
};

export default ExerSchedule;
