"use client";
import React, { useState, useCallback } from "react";
import Navbar from "../components/Navbar";
import styled from "styled-components";
import SearchExercises from "../components/homeComponents/SearchExercise/SearchExercises";
import ScheduleStack from "../components/ScheduleComponent/ScheduleStack";
import ExerSchedule from "./ExerSchedule";

const ScheduleWrapper = styled.div`
  background-color: "#f3a5a5";
`;
const page = () => {
  const [exercises, setExercises] = useState([]);
  const [bodyPart, setBodyPart] = useState("all");
  const [updateTrigger, setUpdateTrigger] = useState(0);

  const triggerUpdate = useCallback(() => {
    setUpdateTrigger((prev) => prev + 1);
  }, []);
  return (
    <ScheduleWrapper>
      <Navbar />
      <SearchExercises setExercises={setExercises} />
      <ScheduleStack exercises={exercises} setExercises={setExercises} />
      <ExerSchedule updateTrigger={updateTrigger} />
    </ScheduleWrapper>
  );
};

export default page;
