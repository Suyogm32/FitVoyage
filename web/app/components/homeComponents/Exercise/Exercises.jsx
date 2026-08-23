import React, { useEffect, useState } from "react";
import { Pagination } from "@mui/material";
import { Box, Stack, Typography } from "@mui/material";
import ExerciseCard from "./ExerciseCard";
import axios from "axios";
import AddExercise from "@/app/AddExercise/AddExercise";
import apiClient from "@/lib/apiClient";

const Exercises = ({ setExercises, bodyPart, exercises }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [showPopup, setShowPopup] = useState(false);
  const [addExer, setAddExer] = useState({});
  const exercisesPerPage = 8;
  const indexOfLastExercise = currentPage * exercisesPerPage;
  const indexOfFirstExercise = indexOfLastExercise - exercisesPerPage;
  const currentExercises = exercises?.slice(
    indexOfFirstExercise,
    indexOfLastExercise,
  );

  useEffect(() => {
    const fetchExercisesData = async () => {
      let exercisesData = [];
      if (bodyPart === "all") {
        exercisesData = await apiClient.get("/api/exercisedb");
      } else {
        exercisesData = await apiClient.get("/api/exercisedb/bodyPart", {
          params: { bodyPart },
        });
      }
      setExercises(exercisesData.data);
    };
    fetchExercisesData();
    if (addExer.name) {
      setShowPopup(true);
    }
  }, [bodyPart, addExer]);

  const paginate = (e, value) => {
    setCurrentPage(value);
    document.getElementById("showing-results").scrollIntoView({
      behavior: "smooth",
    });
  };

  return (
    <Box id="exercises" sx={{ mt: { lg: "110px" } }} mt="50px" p={"20px"}>
      <Typography id="showing-results" variant="h4" mb={"40px"}>
        Showing results
      </Typography>
      <Stack
        direction={"row"}
        sx={{ gap: { lg: "110px", xs: "50px" } }}
        flexWrap={"wrap"}
        justifyContent={"center"}
      >
        {currentExercises?.map((exer, index) => (
          <ExerciseCard key={index} exercise={exer} setAddExer={setAddExer} />
        ))}
      </Stack>
      {showPopup && (
        <>
          {console.log("Neaserst to component", addExer)}
          <AddExercise exerc={addExer} setShowPopup={setShowPopup} />
        </>
      )}
      <Stack mt={"50px"} alignItems={"center"}>
        {exercises?.length > 8 && (
          <Pagination
            color="standard"
            shape="circular"
            defaultPage={1}
            count={Math.ceil(exercises.length / exercisesPerPage)}
            page={currentPage}
            onChange={paginate}
            size="large"
          />
        )}
      </Stack>
    </Box>
  );
};

export default Exercises;
