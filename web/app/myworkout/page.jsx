"use client";
import React, { useState, useEffect, useCallback } from "react";
import Navbar from "../components/Navbar";
import Calender from "../components/MyWorkout/Calender";
import WorkoutCard from "../components/MyWorkout/WorkoutCard";
import WorkoutColumn from "../components/MyWorkout/WorkoutColumn";
import LogSetsModal from "../components/MyWorkout/LogSetsModal";
import styled from "styled-components";
import axios from "axios";
import dayjs from "dayjs";
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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [exercises, setExercises] = useState([]);
  const [modalExercise, setModalExercise] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
  );

  const loadExercises = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/MySchedule", {
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
    loadExercises();
  }, [loadExercises]);

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
      await axios.post("/api/MySchedule", {
        date: dayjs(selectedDate).format("DD/MM/YY"),
        day: days[new Date(selectedDate).getDay()],
        exercise_ID: modalExercise.exerciseId,
        setsCompleted,
      });
      setModalExercise(null);
      loadExercises();
    } catch (error) {
      console.error("Error saving log:", error);
    }
  };

  return (
    <WorkoutWrapper>
      <Navbar />
      <div className="flex flex-col gap-8 md:flex-row ml-4 items-start">
        <Calender
          className="flex flex-auto"
          setSelectedDate={setSelectedDate}
        />
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <WorkoutColumn id="todo-column" title="Workout Schedule">
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
