import React, { useEffect, useState, usePathname } from "react";
import styled from "styled-components";
import ScheduleExerciseCard from "./ScheduleExerciseCard";
import axios from "axios";

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* 3 columns */
  grid-template-rows: auto; /* Rows with automatic height based on content */
  gap: 10px;
  width: 100%;
  padding: 10px;
  margin: auto;
  /* Align the entire grid */
  justify-content: center; /* Center the grid horizontally */
  align-content: start; /* Align the grid to the top vertically */

  /* Align grid items */
  justify-items: start; /* Align items to the start (left) of each column */
  align-items: start; /* Align items to the start (top) of each row */
  /* Medium screens */
  @media screen and (max-width: 1000px) {
    grid-template-columns: repeat(2, 1fr); /* 2 columns for medium screens */
  }

  /* Small screens */
  @media screen and (max-width: 600px) {
    grid-template-columns: repeat(1, 1fr); /* Single column for small screens */
  }
`;

const GridItem = styled.div`
  background-color: white;
  padding: 20px;
  font-size: 1.2em;
  border-radius: 5px;
  display: flex;
  flex-direction: column; /* Ensure items are stacked vertically */
  align-items: flex-start; /* Align items to the top-left */
  justify-content: flex-start; /* Align content to the top */
`;

const ExerSchedule = ({ updateTrigger }) => {
  const ss = typeof window !== "undefined" ? window.sessionStorage : null;
  const [schedule, setSchedule] = useState({});
  const [error, setError] = useState(null);

  const fetchSchedule = async () => {
    try {
      const response = await axios.get(`/api/MySchedule`);
      if (response.data && response.data[0]?.schedule) {
        setSchedule(response.data[0].schedule);
        setError(null);
      } else {
        setSchedule({});
        setError("No Schedule Available!");
      }
    } catch (error) {
      console.error("Error fetching schedule:", error);
      setError("Failed to load schedule. Please try again later.");
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, [updateTrigger]); // Re-fetch schedule when updateTrigger changes
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
      }}
    >
      {error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : (
        <GridContainer className="items-center">
          {schedule && Object.keys(schedule).length > 0 ? (
            Object.keys(schedule).map((day) => (
              <GridItem key={day} style={{ marginBottom: "20px" }}>
                <h3>{day.toUpperCase()}</h3>
                <div>
                  {schedule[day].length > 0 ? (
                    <ul>
                      {schedule[day].map((exercise) => (
                        <li key={exercise._id}>
                          {" "}
                          {/* Ensure exercise has a unique identifier */}
                          <ScheduleExerciseCard
                            exercise={exercise}
                            day={day}
                            onRemoved={fetchSchedule}
                            className="gap-4"
                          />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No exercises scheduled for {day}.</p>
                  )}
                </div>
              </GridItem>
            ))
          ) : (
            <p>No schedule available.</p>
          )}
        </GridContainer>
      )}
    </div>
  );
};

export default ExerSchedule;
