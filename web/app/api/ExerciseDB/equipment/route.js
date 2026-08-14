import { ExerciseDB } from "@/models/ExerciseData";
import { mongooseConnect } from "@/lib/mongoose";
import { NextResponse } from "next/server";

export const GET = async (req) => {
  try {
    await mongooseConnect();
    const { searchParams } = new URL(req.url);
    const equipment = searchParams.get("equipment");
    if (equipment) {
      const EquipmentExercises = await ExerciseDB.find({
        equipment: equipment,
      }).limit(5);
      return new NextResponse(JSON.stringify(EquipmentExercises), {
        status: 200,
      });
    } else {
      return new NextResponse(
        JSON.stringify({ message: "No such equipment found" }),
        { status: 200 },
      );
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
