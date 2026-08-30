"use client";
import React, { useState, useEffect, useCallback } from "react";
import Calender from "@/app/components/MyWorkout/Calender";
import WorkoutCard from "@/app/components/MyWorkout/WorkoutCard";
import WorkoutColumn from "@/app/components/MyWorkout/WorkoutColumn";
import LogSetsModal from "@/app/components/MyWorkout/LogSetsModal";
import AdHocLogModal from "@/app/components/MyWorkout/AdHocLogModal";
import ReadinessCheckIn from "@/app/components/MyWorkout/ReadinessCheckIn";
import WeeklyProgress from "@/app/components/MyWorkout/WeeklyProgress";
import dayjs from "dayjs";
import { Button, Typography } from "@mui/material";
import apiClient from "@/lib/apiClient";
import { useProgress } from "@/lib/useProgress";
import { useUserProfile } from "@/lib/useUserProfile";
import { useCoachSuggestions } from "@/lib/useCoachSuggestions";
import { useDayFocus } from "@/lib/useDayFocus";
import { buildGreeting } from "@/lib/greeting";
import { useAuth } from "@/app/api/Authprovider/Authprovider";
import { useToast } from "@/app/components/ToastProvider";

import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [exercises, setExercises] = useState([]);
  const [modalExercise, setModalExercise] = useState(null);
  const [showAdHoc, setShowAdHoc] = useState(false);
  const [weekRefreshTrigger, setWeekRefreshTrigger] = useState(0);
  const toast = useToast();

  const { stats } = useProgress({
    referenceDate: selectedDate,
    refreshTrigger: weekRefreshTrigger,
  });
  const { profile } = useUserProfile();
  const coachMode = Boolean(profile?.coachMode);

  const formattedDate = dayjs(selectedDate).format("DD/MM/YY");
  const dayKey = days[new Date(selectedDate).getDay()];
  const isToday = dayjs(selectedDate).isSame(dayjs(), "day");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
  );

  const { dayFocus } = useDayFocus();
  const { user } = useAuth();

  const loadExercises = useCallback(async () => {
    try {
      const { data } = await apiClient.get("/api/myschedule", {
        params: { date: formattedDate, day: dayKey },
      });
      setExercises(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading schedule:", error);
    }
  }, [formattedDate, dayKey]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  const suggestions = useCoachSuggestions({
    date: formattedDate,
    day: dayKey,
    refreshTrigger: weekRefreshTrigger,
  });

  const todo = exercises.filter((e) => e.status === "incomplete");
  const done = exercises.filter((e) => e.status !== "incomplete");

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || over.id !== "done-column") return;
    const exercise = exercises.find((e) => e._id === active.id);
    if (exercise) setModalExercise(exercise);
  };

  const handleSaveLog = async (setsCompleted, feel) => {
    if (!modalExercise) return;
    const name = modalExercise.exerciseName;
    try {
      await apiClient.post("/api/myschedule", {
        date: formattedDate,
        day: dayKey,
        exercise_ID: modalExercise.exerciseId,
        setsCompleted,
        feel,
      });
      setModalExercise(null);
      loadExercises();
      setWeekRefreshTrigger((prev) => prev + 1);
      toast.success(`${name} logged`);
    } catch (error) {
      console.error("Error saving log:", error);
      toast.error("Couldn't save that log. Please try again.");
    }
  };

  const refreshAfterAdHoc = () => {
    loadExercises();
    setWeekRefreshTrigger((prev) => prev + 1);
  };

  // Applying a suggestion is a schedule edit, so it goes through the same
  // versioned PATCH: the old entry is tombstoned and a new one dated today
  // replaces it. Past dates keep the targets they actually had.
  const applySuggestion = async (exercise, suggestion) => {
    try {
      await apiClient.patch("/api/saveworkout", {
        day: dayKey,
        exerciseEntryId: exercise._id,
        updates: {
          numberOfSets: exercise.numberOfSets,
          targetReps: suggestion.suggestedReps,
          usesWeight: exercise.usesWeight,
          targetWeight: suggestion.usesWeight
            ? suggestion.suggestedWeights.filter((w) => w != null)
            : [],
          weightUnit: exercise.weightUnit,
        },
      });
      loadExercises();
      setWeekRefreshTrigger((prev) => prev + 1);
      toast.success(`New targets applied to ${exercise.exerciseName}`);
    } catch (error) {
      console.error("Error applying suggestion:", error);
      toast.error("Couldn't apply that suggestion. Please try again.");
    }
  };

  return (
    <>
      {/* Rest day is derived from having nothing scheduled, so it can't
          disagree with the actual plan. */}
      <div className="mb-4">
        <Typography variant="h5" textTransform="capitalize">
          {buildGreeting({
            displayName: user?.displayName,
            focus: dayFocus[dayKey],
            hasExercises: exercises.length > 0,
            isToday,
            dayKey,
            completedCount: done.length,
            totalCount: exercises.length,
          })}
        </Typography>
      </div>
      {/* Only for today — "how are you feeling" is a present-tense question,
          and coach mode users opted into being asked. */}
      {coachMode && isToday && (
        <div className="mb-6">
          <ReadinessCheckIn date={formattedDate} day={dayKey} />
        </div>
      )}

      <div className="flex flex-col gap-8 md:flex-row items-start">
        <Calender
          className="flex flex-auto"
          setSelectedDate={setSelectedDate}
        />
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
                  suggestion={suggestions[exercise.exerciseId]}
                  onApplySuggestion={applySuggestion}
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
                  suggestion={suggestions[exercise.exerciseId]}
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

      <div className="mt-8">
        <WeeklyProgress currentWeek={stats?.currentWeek} />
      </div>

      {showAdHoc && (
        <AdHocLogModal
          date={formattedDate}
          day={dayKey}
          onClose={() => setShowAdHoc(false)}
          onSaved={refreshAfterAdHoc}
        />
      )}

      {modalExercise && (
        <LogSetsModal
          exercise={modalExercise}
          coachMode={coachMode}
          onSave={handleSaveLog}
          onClose={() => setModalExercise(null)}
        />
      )}
    </>
  );
};

export default MyWorkout;
