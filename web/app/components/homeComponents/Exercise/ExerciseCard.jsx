import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/api/Authprovider/Authprovider";
import { Button, Stack, Typography } from "@mui/material";

const ExerciseCard = ({ exercise, setAddExer }) => {
  const { user } = useAuth();
  const router = useRouter();

  const handleClick = () => {
    if (!user) {
      router.push("/login");
      return;
    }
    setAddExer(exercise);
  };

  return (
    <div className="exercise-card bg-white rounded-lg w-[300px]">
      <Link href={`/exercise/${exercise.id}`}>
        <img
          src={exercise.gifUrl}
          alt={exercise.name}
          loading="lazy"
          className="rounded-lg"
        />
      </Link>
      <Stack
        direction={"row"}
        justifyContent={"space-between"}
        borderRadius={"50%"}
      >
        <div>
          <Button
            sx={{
              ml: "20px",
              color: "#fff",
              background: "#ffa9a9",
              fontSize: "12px",
              borderRadius: "20px",
              textTransform: "capitalize",
            }}
          >
            {exercise.bodyPart}
          </Button>
          <Button
            sx={{
              ml: "20px",
              color: "#fff",
              background: "#fcc757",
              fontSize: "12px",
              borderRadius: "20px",
              textTransform: "capitalize",
            }}
          >
            {exercise.target}
          </Button>
        </div>
        <button className="mr-4" onClick={handleClick}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="red"
            className="w-8 h-8"
          >
            <path
              fillRule="evenodd"
              d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 9a.75.75 0 0 0-1.5 0v2.25H9a.75.75 0 0 0 0 1.5h2.25V15a.75.75 0 0 0 1.5 0v-2.25H15a.75.75 0 0 0 0-1.5h-2.25V9Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </Stack>
      <Link
        href={`/exercise/${exercise.id}`}
        className="exercise-card bg-white rounded-lg"
      >
        <Typography
          ml={"20px"}
          color={"#000"}
          fontWeight={"bold"}
          mt={"10px"}
          p={"10px"}
          textTransform={"capitalize"}
          fontSize={"20px"}
        >
          {exercise.name}
        </Typography>
      </Link>
    </div>
  );
};

export default ExerciseCard;
