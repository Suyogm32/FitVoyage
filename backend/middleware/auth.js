import { getAuth } from "firebase-admin/auth";
import "../config/firebase.js";
import { User } from "../models/User.js";

export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  let decoded;
  try {
    decoded = await getAuth().verifyIdToken(token);
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  try {
    let user = await User.findOne({ firebaseUid: decoded.uid });

    if (!user) {
      // No user tied to this Firebase UID yet. Check for a pre-Firebase
      // account with the same email (leftover from the old NextAuth
      // credentials signup) before creating a new one, so we don't collide
      // with the unique email index.
      const legacyUser = await User.findOne({ email: decoded.email });
      if (legacyUser) {
        legacyUser.firebaseUid = decoded.uid;
        await legacyUser.save();
        user = legacyUser;
      } else {
        user = await User.create({
          firebaseUid: decoded.uid,
          email: decoded.email,
          name: decoded.name || decoded.email,
        });
      }
    }

    req.user = { uid: decoded.uid, email: decoded.email, dbId: user._id };
    next();
  } catch (err) {
    console.error("User lookup/creation failed:", err.message);
    return res.status(500).json({ message: "Error resolving user profile" });
  }
};