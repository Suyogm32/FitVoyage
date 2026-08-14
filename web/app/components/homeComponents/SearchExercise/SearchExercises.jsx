import React, { useEffect, useState } from "react";
import { TextField, Button, Box } from "@mui/material";
import HorizontalScrollBar from "./HorizontalScrollBar";
import axios from "axios";
const SearchExercises = ({ setExercises, bodyPart, setBodyPart }) => {
  const [search, setSearch] = useState("");
  const [bodyParts, setBodyParts] = useState([]);
  useEffect(() => {
    const fetchExercisesData = async () => {
      const resp = await axios.get("/api/ExerciseDB/bodyPart");
      const bodyPartsData = resp.data;
      setBodyParts(["all", ...bodyPartsData]);
    };
    fetchExercisesData();
  }, []);
  const handleSearch = async (exercise) => {
    if (search) {
      const resp = await axios.get("/api/ExerciseDB");
      const exerciseData = resp.data;
      const searchedExercises = exerciseData.filter(
        (exercise) =>
          exercise.name.toLowerCase().includes(search) ||
          exercise.target.toLowerCase().includes(search) ||
          exercise.equipment.toLowerCase().includes(search) ||
          exercise.bodyPart.toLowerCase().includes(search),
      );
      setSearch("");
      setExercises(searchedExercises);
    }
  };
  return (
    <div className="flex flex-col justify-center items-center md:mt-16">
      {bodyPart && (
        <>
          <h1 className="font-semibold">Awesome Exercises You</h1>
          <h1 className="font-semibold">Should Know</h1>
        </>
      )}
      <div className=" flex mt-8 justify-center gap-2">
        <TextField
          sx={{
            input: { fontWeight: "700", border: "none", borderRadius: "5px" },
            width: { lg: "1170px", xs: "250px", md: "600px" },
            backgroundColor: "#fff",
          }}
          height="76px"
          value={search}
          placeholder="Search for Exercises"
          onChange={(e) => {
            setSearch(e.target.value.toLowerCase());
          }}
        />
        <Button variant="contained" color="error" onClick={handleSearch}>
          Search
        </Button>
      </div>
      {/* <Box sx={{position:'relative',width:'100%', p:'20px'}}> */}
      {bodyPart && (
        <HorizontalScrollBar
          data={bodyParts}
          bodyPart={bodyPart}
          setBodyPart={setBodyPart}
        />
      )}
      {/* </Box> */}
    </div>
  );
};

export default SearchExercises;
