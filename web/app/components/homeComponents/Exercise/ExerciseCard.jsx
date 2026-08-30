"use client";
import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/api/Authprovider/Authprovider";
import { Stack, Typography, Chip } from "@mui/material";
import { PlusCircle } from "lucide-react";

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
    <div className="exercise-card bg-card text-card-foreground border border-border rounded-lg w-full h-full flex flex-col overflow-hidden">
      <Link href={`/exercise/${exercise.id}`}>
        {/* Explicit white behind the gif — these images are dark line art on
            a transparent background, so they vanish on a dark surface. */}
        <img
          src={exercise.gifUrl}
          alt={exercise.name}
          loading="lazy"
          className="rounded-t-lg bg-white w-full"
        />
      </Link>

      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        className="px-3 pt-3"
      >
        <div className="flex gap-2 flex-wrap">
          <Chip
            label={exercise.bodyPart}
            size="small"
            sx={{ textTransform: "capitalize" }}
          />
          <Chip
            label={exercise.target}
            size="small"
            variant="outlined"
            sx={{ textTransform: "capitalize" }}
          />
        </div>
        <button
          onClick={handleClick}
          aria-label={`Add ${exercise.name} to schedule`}
        >
          <PlusCircle size={28} style={{ color: "hsl(var(--primary))" }} />
        </button>
      </Stack>

      <Link href={`/exercise/${exercise.id}`}>
        <Typography
          className="px-3 py-3"
          fontWeight="bold"
          textTransform="capitalize"
          fontSize="18px"
        >
          {exercise.name}
        </Typography>
      </Link>
    </div>
  );
};

export default ExerciseCard;
