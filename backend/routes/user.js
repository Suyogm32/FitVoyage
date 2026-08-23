import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";

const router = Router();

// Returns the logged-in user's own profile fields (currently just weight
// unit preference). requireAuth already resolves req.user.dbId, so this
// never trusts a client-supplied id.
router.get("/", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.dbId).select(
      "name email preferredWeightUnit",
    );
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Error fetching profile.", error: error.message });
  }
});

router.patch("/", requireAuth, async (req, res) => {
  try {
    const { preferredWeightUnit } = req.body;

    if (preferredWeightUnit && !["kg", "lb"].includes(preferredWeightUnit)) {
      return res.status(400).json({ message: "preferredWeightUnit must be 'kg' or 'lb'." });
    }

    const user = await User.findByIdAndUpdate(
      req.user.dbId,
      { $set: { ...(preferredWeightUnit && { preferredWeightUnit }) } },
      { new: true },
    ).select("name email preferredWeightUnit");

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Error updating profile.", error: error.message });
  }
});

export default router;
