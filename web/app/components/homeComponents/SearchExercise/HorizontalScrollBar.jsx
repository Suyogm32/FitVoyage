import React from "react";
import { Box } from "@mui/material";
import BodyPart from "./BodyPart";

const HorizontalScrollBar = ({ data, bodyPart, setBodyPart }) => {
  const slideLeft = () => {
    var slider = document.getElementById("slider");
    slider.scrollLeft = slider.scrollLeft - 500;
  };
  const slideRight = () => {
    var slider = document.getElementById("slider");
    slider.scrollLeft = slider.scrollLeft + 500;
  };
  return (
    <Box sx={{ position: "relative", width: "100%", p: "20px" }}>
      <div className="relative flex items-center">
        <div
          id="slider"
          className="w-full h-full overflow-x-scroll scroll whitespace-nowrap scroll-smooth"
        >
          {data.map((item, index) => (
            <Box key={index} m="0 40px" className="mt-8 inline-block">
              <BodyPart
                item={item}
                bodyPart={bodyPart}
                setBodyPart={setBodyPart}
              />
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
    </Box>
  );
};

export default HorizontalScrollBar;
