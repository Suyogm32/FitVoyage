import { User } from "@/models/User";
import { mongooseConnect } from "@/lib/mongoose";
import { NextResponse } from "next/server";

export const POST = async (req) => {
  try {
    const { token } = await req.json();
    if (!token) {
      return new NextResponse(JSON.stringify({ message: "Missing token." }), {
        status: 400,
      });
    }

    await mongooseConnect();
    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return new NextResponse(
        JSON.stringify({
          message: "Invalid or already-used verification link.",
        }),
        { status: 400 },
      );
    }

    if (user.verificationTokenExpires < new Date()) {
      return new NextResponse(
        JSON.stringify({
          message: "This verification link has expired. Request a new one.",
        }),
        { status: 400 },
      );
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    return new NextResponse(
      JSON.stringify({ message: "Email verified successfully." }),
      { status: 200 },
    );
  } catch (error) {
    return new NextResponse(
      JSON.stringify({
        message: "Error verifying email",
        error: error.message,
      }),
      { status: 500 },
    );
  }
};
