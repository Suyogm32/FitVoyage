import React from "react";
import { Box } from "@mui/material";
import ExerciseCard from "../homeComponents/Exercise/ExerciseCard";
const HorizontalScrollForExercises = ({ exerciseData }) => {
  const slideLeft = () => {
    var slider = document.getElementById("slider");
    slider.scrollLeft = slider.scrollLeft - 800;
  };
  const slideRight = () => {
    var slider = document.getElementById("slider");
    slider.scrollLeft = slider.scrollLeft + 800;
  };
  return (
    <div>
      <div className="relative flex items-center">
        <div
          id="slider"
          className="w-full h-full overflow-x-scroll scroll whitespace-nowrap scroll-smooth"
        >
          {exerciseData?.map((item, index) => (
            <Box
              key={index}
              m="0 40px"
              className="mt-8 inline-block bg-white rounded-lg"
            >
              <ExerciseCard key={index} exercise={item} />
            </Box>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <div className="ml-auto left-arrow" onClick={slideLeft}>
          <img src={"/icons/left-arrow.png"} alt="right-arrow" />
        </div>
        <div onClick={slideRight} className="left-arraow">
          <img src={"/icons/right-arrow.png"} alt="right-arrow" />
        </div>
      </div>
    </div>
  );
};

export default HorizontalScrollForExercises;
