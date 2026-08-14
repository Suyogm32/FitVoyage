"use client";
import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import { fetchData, youtubeVideoOptions } from "@/app/utils/fetchData";
import Details from "@/app/components/ExerciseDetails/Details";
import ExerciseVideos from "@/app/components/ExerciseDetails/ExerciseVideos";
import SimilarExercises from "@/app/components/ExerciseDetails/SimilarExercises";

import axios from "axios";
import Footer from "@/app/components/Footer";
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
      const exercisesDetails = await axios.get(`/api/ExerciseDB?id=${id}`);
      setCurrentExercise(exercisesDetails.data);

      const exerciseVideosDetails = await fetchData(
        `https://youtube-search-and-download.p.rapidapi.com/search?query=${exercisesDetails.data.name}`,
        youtubeVideoOptions,
      );
      console.log("ExerciseVideosDetails are ->", exerciseVideosDetails);
      setExerciseVideosData(exerciseVideosDetails);

      const targetMuscleExerciseDetails = await axios.get(
        `/api/ExerciseDB/target?target=${exercisesDetails.data.target}`,
      );
      setTargetMuscleExerciseData(targetMuscleExerciseDetails.data);

      const equipmentExerciseDetails = await axios.get(
        `/api/ExerciseDB/equipment?equipment=${exercisesDetails.data.equipment}`,
      );
      setEquipmentExerciseData(targetMuscleExerciseDetails.data);
    };
    fetchExercisesData();
  }, []);
  return (
    <>
      <Navbar />
      <Details exerciseDetail={currentExercise} />
      <ExerciseVideos
        exerciseVideosData={exerciseVideosData}
        exerciseName={currentExercise.name}
      />
      <SimilarExercises
        targetMuscleExercises={targetMuscleExerciseData}
        equipmentExercises={equipmentExerciseData}
      />
      <Footer />
    </>
  );
};

export default ExerciseDetail;
