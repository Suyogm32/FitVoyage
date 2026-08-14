import { User } from "@/models/User";
import { mongooseConnect } from "@/lib/mongoose";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { sendVerificationEmail } from "@/lib/resend";
import { getBaseUrl } from "@/lib/utils";

export const POST = async (req) => {
  try {
    const { email } = await req.json();
    if (!email) {
      return new NextResponse(JSON.stringify({ message: "Missing email." }), {
        status: 400,
      });
    }

    await mongooseConnect();
    const user = await User.findOne({ email });

    if (!user) {
      return new NextResponse(
        JSON.stringify({ message: "No account found for this email." }),
        { status: 404 },
      );
    }
    if (user.isVerified) {
      return new NextResponse(
        JSON.stringify({ message: "This account is already verified." }),
        { status: 400 },
      );
    }

    user.verificationToken = crypto.randomBytes(32).toString("hex");
    user.verificationTokenExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const verifyUrl = `${getBaseUrl()}/verify-email?token=${user.verificationToken}`;
    await sendVerificationEmail(email, verifyUrl);

    return new NextResponse(
      JSON.stringify({ message: "Verification email resent." }),
      { status: 200 },
    );
  } catch (error) {
    return new NextResponse(
      JSON.stringify({
        message: "Error resending verification email",
        error: error.message,
      }),
      { status: 500 },
    );
  }
};
