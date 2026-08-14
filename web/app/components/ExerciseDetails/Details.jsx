import React from "react";
import { Typography, Stack, Button } from "@mui/material";
const Details = ({ exerciseDetail }) => {
  const {
    bodyPart,
    gifUrl,
    name,
    target,
    equipment,
    instructions,
    secondaryMuscles,
  } = exerciseDetail;

  const extendedDetails = [
    {
      icon: "/icons/body-part.png",
      name: [bodyPart],
    },
    {
      icon: "/icons/target.png",
      name: secondaryMuscles ? [target, ...secondaryMuscles] : [target],
    },
    {
      icon: "/icons/equipment.png",
      name: [equipment],
    },
  ];
  return (
    <Stack
      gap={"50px"}
      sx={{
        flexDirection: { lg: "row", xs: "column" },
        p: "20px",
        alignItems: "center",
      }}
    >
      <img src={gifUrl} alt={name} loading="lazy" className="detail-image" />
      <Stack sx={{ gap: { lg: "30px", xs: "15px" } }}>
        <Typography variant="h3" textTransform={"capitalize"}>
          {name}
        </Typography>
        <Typography variant="h5">Steps to perform</Typography>
        <ol>
          {instructions?.map((instruction, index) => (
            <li key={index}>{instruction}</li>
          ))}
        </ol>
        {extendedDetails?.map((item, index) => (
          <Stack
            key={index}
            direction={"row"}
            gap={"20px"}
            alignItems={"center"}
          >
            <Button
              sx={{ background: "#fff2db", borderRadius: "50%", p: "10px" }}
            >
              <img src={item.icon} alt={item.name} />
            </Button>
            <div className="flex gap-2">
              {item.name?.map((muscle, index) => (
                <Typography key={index} textTransform={"capitalize"}>
                  {muscle},
                </Typography>
              ))}
            </div>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
};

export default Details;
