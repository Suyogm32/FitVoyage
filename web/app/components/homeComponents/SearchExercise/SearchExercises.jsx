import React, { useEffect, useState } from "react";
import { TextField, Button, Box } from "@mui/material";
import HorizontalScrollBar from "./HorizontalScrollBar";
import apiClient from "@/lib/apiClient";

const SearchExercises = ({ setExercises, bodyPart, setBodyPart }) => {
  const [search, setSearch] = useState("");
  const [bodyParts, setBodyParts] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const fetchExercisesData = async () => {
      const resp = await apiClient.get("/api/exercisedb/bodyPart");

      const bodyPartsData = resp.data;
      setBodyParts(["all", ...bodyPartsData]);
    };
    fetchExercisesData();
  }, []);
  const handleSearch = async () => {
    if (!search || searching) return;
    setSearching(true);
    try {
      const resp = await apiClient.get("/api/exercisedb", {
        params: { search },
      });
      setExercises(resp.data);
      setSearch("");
    } catch (error) {
      console.error("Error searching exercises:", error);
    } finally {
      setSearching(false);
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
      <div className="flex mt-8 justify-center gap-2 w-full max-w-3xl px-4">
        <TextField
          sx={{
            flex: 1,
            "& .MuiInputBase-input": { fontWeight: 600 },
            "& .MuiOutlinedInput-root": {
              backgroundColor: "hsl(var(--card))",
              borderRadius: "10px",
            },
          }}
          value={search}
          placeholder="Search for Exercises"
          onChange={(e) => {
            setSearch(e.target.value.toLowerCase());
          }}
        />
        <Button
          variant="contained"
          color="error"
          onClick={handleSearch}
          disabled={searching}
        >
          {searching ? "Searching..." : "Search"}
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
