"use client";
import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../api/Authprovider/Authprovider";
import Navbar from "../components/Navbar";
import styled from "styled-components";
import SearchExercises from "../components/homeComponents/SearchExercise/SearchExercises";
import ScheduleStack from "../components/ScheduleComponent/ScheduleStack";
import ExerSchedule from "./ExerSchedule";

const ScheduleWrapper = styled.div`
  background-color: "#f3a5a5";
`;
const page = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [exercises, setExercises] = useState([]);
  const [bodyPart, setBodyPart] = useState("all");
  const [updateTrigger, setUpdateTrigger] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const triggerUpdate = useCallback(() => {
    setUpdateTrigger((prev) => prev + 1);
  }, []);

  if (loading || !user) {
    return null;
  }

  return (
    <ScheduleWrapper>
      <Navbar />
      <SearchExercises setExercises={setExercises} />
      <ScheduleStack
        exercises={exercises}
        setExercises={setExercises}
        onScheduleChange={triggerUpdate}
      />
      <ExerSchedule updateTrigger={updateTrigger} />
    </ScheduleWrapper>
  );
};

export default page;
