import React from "react";
import { Box, Stack, Typography } from "@mui/material";
const Footer = () => {
  return (
    <Box mt={"80px"} bgcolor={"#fff3f3"}>
      <Stack gap={"40px"} alignItems="center" px={"20px"} pt={"24px"}>
        <img src={"/images/logo.png"} alt="logo" />
        <Typography
          variant="h5"
          sx={{ fontSize: { lg: "28px", xs: "20px" } }}
          mt="41px"
          textAlign="center"
          pb="40px"
        >
          Made with ❤️ by Suyog Mahangade | suyogm32@gmail.com
        </Typography>
      </Stack>
    </Box>
  );
};

export default Footer;
