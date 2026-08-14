import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Box, Stack, Typography } from "@mui/material";
import { fetchData, youtubeVideoOptions } from "@/app/utils/fetchData";
import VideoCard from "./VideoCard";
const ExerciseVideos = ({ exerciseVideosData, exerciseName }) => {
  return (
    <Box sx={{ mt: { lg: "150px", xs: "20px" } }} p={"20px"}>
      <Typography variant="h3" mb={"25px"}>
        Watch videos of{" "}
        <span style={{ color: "#ff2625", textTransform: "capitalize" }}>
          {exerciseName}
        </span>
      </Typography>
      <Stack
        justifyContent={"flex-start"}
        flexWrap={"wrap"}
        alignItems={"center"}
        sx={{
          flexDirection: { lg: "row", md: "row", xs: "column" },
          gap: { lg: "100px", xs: "10px" },
        }}
      >
        {exerciseVideosData?.contents?.slice(0, 3).map((item, index) => (
          <Link
            key={index}
            href={`https://www.youtube.com/watch?v=${item.video?.videoId}`}
            className="exercise-video mb-4"
            target="_blank"
            rel={"noreferrer"}
          >
            <VideoCard
              thumbnail={item.video?.thumbnails?.[0].url}
              title={item.video?.title}
              channel={item.video?.channelName}
            />
            <img
              src={item.video?.thumbnails?.[0].url}
              alt={item.video?.title}
            />
            <Typography variant="h5">{item.video?.title}</Typography>
          </Link>
        ))}
      </Stack>
    </Box>
  );
};

export default ExerciseVideos;
