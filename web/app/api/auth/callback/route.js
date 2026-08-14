// Import required modules
import { NextResponse } from "next/server";
import { getSession } from "next-auth/react";
import clientPromise from "@/lib/mongodb";

// Define the callback function
export default async function callback(req, res) {
  // Check if the user is authenticated
  const session = await getSession({ req });
  if (!session?.user) {
    return NextResponse.redirect("/login");
  }

  // Get the MongoDB ObjectId of the authenticated user
  const user = session.data.user; // Assuming the MongoDB ObjectId is stored in the id field of the session user object
  console.log(user);
  // Fetch additional user data from MongoDB using the userId
  const client = await clientPromise;
  const db = client.db();
  const userData = await db
    .collection("users")
    .findOne({ name: user.name, email: user.email });
  console.log("userdata ->", userData);
  // Check if user data exists
  if (!userData) {
    return NextResponse.error(new Error("User not found"));
  }

  // Include the MongoDB ObjectId in the response
  return NextResponse.json({
    user: {
      ...session.user,
      userId: userData._id, // Include the MongoDB ObjectId as userId
    },
  });
}
