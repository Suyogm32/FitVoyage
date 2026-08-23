"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../api/Authprovider/Authprovider";
import Navbar from "../components/Navbar";
import Calender from "../components/MyWorkout/Calender";
import WorkoutCard from "../components/MyWorkout/WorkoutCard";
import WorkoutColumn from "../components/MyWorkout/WorkoutColumn";
import LogSetsModal from "../components/MyWorkout/LogSetsModal";
import AdHocLogModal from "../components/MyWorkout/AdHocLogModal";
import WeeklyProgress from "../components/MyWorkout/WeeklyProgress";
import styled from "styled-components";
import dayjs from "dayjs";
import { Button } from "@mui/material";
import apiClient from "@/lib/apiClient";
import { useProgress } from "@/lib/useProgress";

import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

const WorkoutWrapper = styled.div`
  background-color: "#f3a5a5";
`;

const days = {
  0: "sun",
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
  5: "fri",
  6: "sat",
};

const MyWorkout = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [exercises, setExercises] = useState([]);
  const [modalExercise, setModalExercise] = useState(null);
  const [showAdHoc, setShowAdHoc] = useState(false);
  const [weekRefreshTrigger, setWeekRefreshTrigger] = useState(0);

  // Only the week breakdown lives on this page now — the full dashboard is
  // on /progress. No range param needed; currentWeek follows the calendar.
  const { stats } = useProgress({
    referenceDate: selectedDate,
    refreshTrigger: weekRefreshTrigger,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
  );

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const loadExercises = useCallback(async () => {
    try {
      const { data } = await apiClient.get("/api/myschedule", {
        params: {
          date: dayjs(selectedDate).format("DD/MM/YY"),
          day: days[new Date(selectedDate).getDay()],
        },
      });

      setExercises(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading schedule:", error);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (user) {
      loadExercises();
    }
  }, [loadExercises, user]);

  if (loading || !user) {
    return null;
  }

  const todo = exercises.filter((e) => e.status === "incomplete");
  const done = exercises.filter((e) => e.status !== "incomplete");

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || over.id !== "done-column") return;
    const exercise = exercises.find((e) => e._id === active.id);
    if (exercise) setModalExercise(exercise);
  };

  const handleSaveLog = async (setsCompleted) => {
    if (!modalExercise) return;
    try {
      await apiClient.post("/api/myschedule", {
        date: dayjs(selectedDate).format("DD/MM/YY"),
        day: days[new Date(selectedDate).getDay()],
        exercise_ID: modalExercise.exerciseId,
        setsCompleted,
      });
      setModalExercise(null);
      loadExercises();
      setWeekRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Error saving log:", error);
    }
  };

  const refreshAfterAdHoc = () => {
    loadExercises();
    setWeekRefreshTrigger((prev) => prev + 1);
  };

  return (
    <WorkoutWrapper>
      <Navbar />

      <div className="flex flex-col gap-8 md:flex-row px-4 items-start mt-6">
        <Calender className="flex flex-auto" setSelectedDate={setSelectedDate} />
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <WorkoutColumn
            id="todo-column"
            title="Workout Schedule"
            action={
              <Button
                size="small"
                variant="outlined"
                onClick={() => setShowAdHoc(true)}
              >
                Log extra
              </Button>
            }
          >
            {todo.length > 0 ? (
              todo.map((exercise) => (
                <WorkoutCard
                  key={exercise._id}
                  exercise={exercise}
                  onLog={setModalExercise}
                  onEdit={setModalExercise}
                />
              ))
            ) : (
              <p>No exercises scheduled for this day.</p>
            )}
          </WorkoutColumn>
          <WorkoutColumn id="done-column" title="Completed">
            {done.length > 0 ? (
              done.map((exercise) => (
                <WorkoutCard
                  key={exercise._id}
                  exercise={exercise}
                  onLog={setModalExercise}
                  onEdit={setModalExercise}
                />
              ))
            ) : (
              <p>
                Drag a card here, or tap &quot;Log Sets&quot;, once you complete
                an exercise.
              </p>
            )}
          </WorkoutColumn>
        </DndContext>
      </div>

      <div className="px-4 mt-8 pb-8">
        <WeeklyProgress currentWeek={stats?.currentWeek} />
      </div>

      {showAdHoc && (
        <AdHocLogModal
          date={dayjs(selectedDate).format("DD/MM/YY")}
          day={days[new Date(selectedDate).getDay()]}
          onClose={() => setShowAdHoc(false)}
          onSaved={refreshAfterAdHoc}
        />
      )}

      {modalExercise && (
        <LogSetsModal
          exercise={modalExercise}
          onSave={handleSaveLog}
          onClose={() => setModalExercise(null)}
        />
      )}
    </WorkoutWrapper>
  );
};

export default MyWorkout;