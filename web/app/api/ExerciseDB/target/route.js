import { ExerciseDB } from "@/models/ExerciseData";
import { mongooseConnect } from "@/lib/mongoose";
import { NextResponse } from "next/server";

export const GET = async (req) => {
  try {
    await mongooseConnect();
    const { searchParams } = new URL(req.url);
    const target = searchParams.get("target");
    if (target) {
      const targetExercises = await ExerciseDB.find({ target: target }).limit(
        5,
      );
      return new NextResponse(JSON.stringify(targetExercises), { status: 200 });
    } else {
      return new NextResponse(
        JSON.stringify({ message: "No target muscle found" }),
        { status: 200 },
      );
    }
  } catch (error) {
    return new NextResponse(
      JSON.stringify({
        message: "Error in fetching exercises for target muscle.",
        error,
      }),
      {
        status: 500,
      },
    );
  }
};
