import { ExerciseDB } from "@/models/ExerciseData";
import { mongooseConnect } from "@/lib/mongoose";
import { NextResponse } from "next/server";

export const GET = async (req) => {
  try {
    await mongooseConnect();
    const { searchParams } = new URL(req.url);
    const bodyPart = searchParams.get("bodyPart");
    if (bodyPart) {
      const exerciseByBodyPart = await ExerciseDB.find({ bodyPart: bodyPart });
      return new NextResponse(JSON.stringify(exerciseByBodyPart), {
        status: 200,
      });
    } else {
      const bodyParts = await ExerciseDB.distinct("bodyPart");
      return new NextResponse(JSON.stringify(bodyParts), {
        status: 200,
      });
    }
  } catch (error) {
    return new NextResponse(
      JSON.stringify({
        message: "Error in fetching equipment exercises",
        error,
      }),
      {
        status: 500,
      },
    );
  }
};
