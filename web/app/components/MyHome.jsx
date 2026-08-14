"use client";
import React, { useState } from "react";
import { Box, Typography } from "@mui/material";
import HeroBanner from "./homeComponents/HeroBanner";
import SearchExercises from "./homeComponents/SearchExercise/SearchExercises";
import Exercises from "./homeComponents/Exercise/Exercises";
import Navbar from "./Navbar";
import styled from "styled-components";
import Footer from "./Footer";

const StyledDiv = styled.div`
  display: grid;
  grid-template-rows: 1fr;
  gap: 20px;
  @media screen and (min-width: 600px) {
    grid-template-rows: none;
    grid-template-columns: 1.1fr 0.9fr;
  }
  @media screen and (min-width: 800px) {
    grid-template-rows: none;
    grid-template-columns: 1.2fr 0.8fr;
  }
  @media screen and (min-width: 1000px) {
    grid-template-rows: none;
    grid-template-columns: 1.3fr 0.7fr;
  }
`;
const MyHome = () => {
  const [exercises, setExercises] = useState([]);
  const [bodyPart, setBodyPart] = useState("all");

  return (
    <div>
      <StyledDiv className="lg:justify-around">
        <div className="gap-[10px]">
          <Navbar className="mb-8" />
          <div className="flex items-center justify-center mt-4">
            <img
              src="/images/banner2.jpg"
              alt="gym"
              className="sm:hidden max-h-[300px] w-auto"
            />
          </div>
          <HeroBanner />
          <Typography
            fontWeight={600}
            color={"#ff2625"}
            sx={{
              position: "absolute",
              left: { sm: "20px", md: "50px" },
              zIndex: -1,
              opacity: 0.2,
              display: { xs: "none", md: "block" },
              fontSize: { sm: "100px", md: "150px", lg: "200px" },
              fontStyle: "italic",
            }}
            zIndex={"-1"}
          >
            EXERCISE
          </Typography>
        </div>
        <div>
          <img
            src="/images/banner.png"
            alt="fitwomen"
            className="hidden sm:inline object-cover"
          />
        </div>
      </StyledDiv>
      <div className="mt-3">
        <SearchExercises
          setExercises={setExercises}
          bodyPart={bodyPart}
          setBodyPart={setBodyPart}
        />
        <Exercises
          setExercises={setExercises}
          bodyPart={bodyPart}
          exercises={exercises}
        />
      </div>
      <Footer />
    </div>
  );
};

export default MyHome;
