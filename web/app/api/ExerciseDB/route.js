import { ExerciseDB } from "@/models/ExerciseData";
import { mongooseConnect } from "@/lib/mongoose";
import { NextResponse } from "next/server";

export const GET = async (req) => {
  try {
    await mongooseConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    console.log(id);
    if (id) {
      const exerciseById = await ExerciseDB.findOne({ id: id });
      return new NextResponse(JSON.stringify(exerciseById), { status: 200 });
    } else {
      const exercises = await ExerciseDB.find({});
      return new NextResponse(JSON.stringify(exercises), { status: 200 });
    }
  } catch (error) {
    return new NextResponse(
      JSON.stringify({
        message: "Error in fetching all exercises",
        error,
      }),
      {
        status: 500,
      },
    );
  }
};
