import { mongooseConnect } from "@/lib/mongoose";
import { NextResponse } from "next/server";
import { Workouts } from "@/models/WorkoutDays";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const PUT = async (req) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(JSON.stringify({ message: "Unauthorized." }), {
        status: 401,
      });
    }
    const uid = session.user.id;

    const { day, userExercise } = await req.json();
    await mongooseConnect();

    let workoutSchedule = await Workouts.findOne({ user: uid });

    if (workoutSchedule) {
      workoutSchedule.schedule[day] = [
        ...workoutSchedule.schedule[day],
        userExercise,
      ];
      await workoutSchedule.save();
      return new NextResponse(
        JSON.stringify({
          message: "Workout added to your schedule.",
          schedule: workoutSchedule.schedule,
        }),
        { status: 200 },
      );
    } else {
      const initialSchedule = {
        mon: [],
        tue: [],
        wed: [],
        thu: [],
        fri: [],
        sat: [],
        sun: [],
      };
      initialSchedule[day] = [userExercise];
      workoutSchedule = new Workouts({ user: uid, schedule: initialSchedule });
      await workoutSchedule.save();
      return new NextResponse(
        JSON.stringify({
          message: "User workout schedule created and workout added.",
          schedule: workoutSchedule.schedule,
        }),
        { status: 201 },
      );
    }
  } catch (error) {
    return new NextResponse(
      JSON.stringify({
        message: "Error processing request.",
        error: error.message,
      }),
      { status: 500 },
    );
  }
};

export const DELETE = async (req) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(JSON.stringify({ message: "Unauthorized." }), {
        status: 401,
      });
    }
    const uid = session.user.id;

    const { day, exerciseEntryId } = await req.json();
    if (!day || !exerciseEntryId) {
      return new NextResponse(
        JSON.stringify({ message: "Missing day or exerciseEntryId." }),
        { status: 400 },
      );
    }

    await mongooseConnect();
    const workoutSchedule = await Workouts.findOne({ user: uid });

    if (!workoutSchedule) {
      return new NextResponse(
        JSON.stringify({ message: "No schedule found for this user." }),
        { status: 404 },
      );
    }

    workoutSchedule.schedule[day] = workoutSchedule.schedule[day].filter(
      (exercise) => exercise._id.toString() !== exerciseEntryId,
    );
    await workoutSchedule.save();

    return new NextResponse(
      JSON.stringify({
        message: "Exercise removed from schedule.",
        schedule: workoutSchedule.schedule,
      }),
      { status: 200 },
    );
  } catch (error) {
    return new NextResponse(
      JSON.stringify({
        message: "Error removing exercise.",
        error: error.message,
      }),
      { status: 500 },
    );
  }
};
