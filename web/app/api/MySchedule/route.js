import { Workouts } from "@/models/WorkoutDays";
import { WorkoutsLog } from "@/models/ExerciseSchema";
import { mongooseConnect } from "@/lib/mongoose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const computeStatus = (exercise, loggedExercise) => {
  if (
    !loggedExercise ||
    !loggedExercise.setsCompleted ||
    loggedExercise.setsCompleted.length === 0
  ) {
    return "incomplete";
  }
  if (loggedExercise.setsCompleted.length < exercise.numberOfSets) {
    return "partial";
  }
  const allTargetsMet = loggedExercise.setsCompleted.every(
    (s) => s.repsCompleted >= s.targetReps,
  );
  return allTargetsMet ? "completed" : "partial";
};

export const GET = async (req) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(JSON.stringify({ message: "Unauthorized." }), {
        status: 401,
      });
    }
    const userId = session.user.id;

    await mongooseConnect();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const day = searchParams.get("day");

    const workoutDoc = await Workouts.findOne({ user: userId }).lean();

    if (!date || !day) {
      return new NextResponse(JSON.stringify(workoutDoc ? [workoutDoc] : []), {
        status: 200,
      });
    }

    const daySchedule = workoutDoc?.schedule?.[day] || [];
    const logDoc = await WorkoutsLog.findOne({ user: userId }).lean();
    const dateLog = logDoc?.exercises_done?.find(
      (entry) => entry.date === date && entry.day === day,
    );

    const merged = daySchedule.map((exercise) => {
      const loggedExercise = dateLog?.exercises?.find(
        (ex) => ex.exercise_ID === exercise.exerciseId,
      );
      return {
        ...exercise,
        status: computeStatus(exercise, loggedExercise),
        setsCompleted: loggedExercise?.setsCompleted || [],
      };
    });

    return new NextResponse(JSON.stringify(merged), { status: 200 });
  } catch (error) {
    return new NextResponse(
      JSON.stringify({
        message: "Error fetching schedule",
        error: error.message,
      }),
      { status: 500 },
    );
  }
};

export const POST = async (req) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(JSON.stringify({ message: "Unauthorized." }), {
        status: 401,
      });
    }
    const userId = session.user.id;

    await mongooseConnect();
    const body = await req.json();
    const { date, day, exercise_ID, setsCompleted } = body;

    if (
      !date ||
      !day ||
      !exercise_ID ||
      !Array.isArray(setsCompleted) ||
      setsCompleted.length === 0
    ) {
      return new NextResponse(
        JSON.stringify({
          message:
            "Missing or invalid request body. Required: date, day, exercise_ID, setsCompleted (non-empty array).",
        }),
        { status: 400 },
      );
    }

    let workoutLog = await WorkoutsLog.findOne({ user: userId });
    if (!workoutLog) {
      workoutLog = new WorkoutsLog({ user: userId, exercises_done: [] });
    }

    let dateEntry = workoutLog.exercises_done.find(
      (entry) => entry.date === date && entry.day === day,
    );

    if (!dateEntry) {
      workoutLog.exercises_done.push({ date, day, exercises: [] });
      dateEntry =
        workoutLog.exercises_done[workoutLog.exercises_done.length - 1];
    }

    const exerciseEntry = dateEntry.exercises.find(
      (ex) => ex.exercise_ID === exercise_ID,
    );

    if (exerciseEntry) {
      exerciseEntry.setsCompleted = setsCompleted;
    } else {
      dateEntry.exercises.push({ exercise_ID, setsCompleted });
    }

    await workoutLog.save();

    return new NextResponse(
      JSON.stringify({
        message: "Exercise log saved.",
        exercise_ID,
        setsCompleted,
      }),
      { status: 200 },
    );
  } catch (error) {
    return new NextResponse(
      JSON.stringify({
        message: "Error saving exercise log",
        error: error.message,
      }),
      { status: 500 },
    );
  }
};
