import { User } from "@/models/User";
import { mongooseConnect } from "@/lib/mongoose";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getBaseUrl } from "@/lib/utils";
import { sendVerificationEmail } from "@/lib/resend";

export const POST = async (req) => {
  try {
    const data = await req.json();
    await mongooseConnect();

    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      return new NextResponse(
        JSON.stringify({
          message: "An account with this email already exists.",
        }),
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpires = new Date(Date.now() + 15 * 60 * 1000);

    const newuser = new User({
      ...data,
      password: hashedPassword,
      isVerified: false,
      verificationToken,
      verificationTokenExpires,
    });
    await newuser.save();

    const verifyUrl = `${getBaseUrl()}/verify-email?token=${verificationToken}`;

    try {
      await sendVerificationEmail(data.email, verifyUrl);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
    }

    return new NextResponse(
      JSON.stringify({
        message: "Account created. Check your email to verify it.",
      }),
      { status: 201 },
    );
  } catch (error) {
    return new NextResponse(
      JSON.stringify({
        message: "Error creating new user",
        error: error.message,
      }),
      { status: 500 },
    );
  }
};
