"use client";
import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { fetchData, youtubeVideoOptions } from "@/app/utils/fetchData";
import Details from "@/app/components/ExerciseDetails/Details";
import ExerciseVideos from "@/app/components/ExerciseDetails/ExerciseVideos";
import SimilarExercises from "@/app/components/ExerciseDetails/SimilarExercises";
import apiClient from "@/lib/apiClient";
import PageShell from "@/app/components/PageShell";

const ExerciseDetail = () => {
  const [currentExercise, setCurrentExercise] = useState({});
  const [exerciseVideosData, setExerciseVideosData] = useState([]);
  const [targetMuscleExerciseData, setTargetMuscleExerciseData] = useState([]);
  const [equipmentExerciseData, setEquipmentExerciseData] = useState([]);
  const path = usePathname();
  let patharray = path.split("/");
  const id = patharray[patharray.length - 1];

  useEffect(() => {
    const fetchExercisesData = async () => {
      const exercisesDetails = await apiClient.get("/api/exercisedb", {
        params: { id },
      });
      setCurrentExercise(exercisesDetails.data);

      const exerciseVideosDetails = await fetchData(
        `https://youtube-search-and-download.p.rapidapi.com/search?query=${exercisesDetails.data.name}`,
        youtubeVideoOptions,
      );
      setExerciseVideosData(exerciseVideosDetails);

      const targetMuscleExerciseDetails = await apiClient.get(
        "/api/exercisedb/target",
        { params: { target: exercisesDetails.data.target } },
      );
      setTargetMuscleExerciseData(targetMuscleExerciseDetails.data);

      const equipmentExerciseDetails = await apiClient.get(
        "/api/exercisedb/equipment",
        { params: { equipment: exercisesDetails.data.equipment } },
      );
      setEquipmentExerciseData(equipmentExerciseDetails.data);
    };
    fetchExercisesData();
  }, [id]);

  return (
    // PageShell picks the chrome: sidebar when signed in, public navbar and
    // footer when not — so an exercise link is shareable with anyone.
    <PageShell title={currentExercise.name}>
      <Details exerciseDetail={currentExercise} />
      <ExerciseVideos
        exerciseVideosData={exerciseVideosData}
        exerciseName={currentExercise.name}
      />
      <SimilarExercises
        targetMuscleExercises={targetMuscleExerciseData}
        equipmentExercises={equipmentExerciseData}
      />
    </PageShell>
  );
};

export default ExerciseDetail;
