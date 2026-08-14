import React from "react";
import { Stack, Typography } from "@mui/material";
const BodyPart = ({ item, bodyPart, setBodyPart }) => {
  const formattedItem = item.replace(/\s+/g, "%20");
  return (
    <Stack
      type="button"
      alignItems={"center"}
      justifyContent={"center"}
      className="bodyPart-card bg-white rounded-xl p-4 gap-4"
      onClick={() => setBodyPart(item)}
    >
      <img
        src={`/gym/${formattedItem}.png`}
        alt={item}
        className="w-24 h-24 rounded-lg"
      />
      <Typography
        sx={{
          fontSize: { xs: "10px", sm: "10px", md: "20px", lg: "25px" },
          textTransform: "capitalize",
        }}
      >
        {item}
      </Typography>
    </Stack>
  );
};

export default BodyPart;
