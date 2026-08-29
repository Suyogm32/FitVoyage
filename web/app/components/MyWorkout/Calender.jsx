"use client";
import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import { StaticDatePicker } from "@mui/x-date-pickers";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Box } from "@mui/material";
import "react-calendar/dist/Calendar.css";

const Calender = ({ setSelectedDate }) => {
  const [value, setValue] = useState(dayjs(new Date()));
  const [isClient, setIsClient] = useState(false);

  // Update the parent component's selectedDate when value changes
  useEffect(() => {
    setSelectedDate(new Date(value?.$d) || new Date());
  }, [value, setSelectedDate]);

  useEffect(() => {
    setIsClient(true);
  }, []);
  return (
    <Box
      sx={{
        mt: "30px",
        display: "flex",
        background: "#fff",
        xs: { alignItems: "center" },
      }}
    >
      {isClient && (
        <LocalizationProvider
          dateAdapter={AdapterDayjs}
          sx={{ display: "flex", flexDirection: { xs: "row", md: "column" } }}
        >
          <StaticDatePicker
            orientation="landscape"
            value={value}
            onChange={(newValue) => setValue(newValue)}
            maxDate={dayjs()}
            sx={{ display: { xs: "inline", md: "inline" } }}
          />
        </LocalizationProvider>
      )}
    </Box>
  );
};

export default Calender;
