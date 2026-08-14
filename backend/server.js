import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import connectDB from "./config/db.js";
import { requireAuth } from "./middleware/auth.js";
import exerciseDBRoutes from "./routes/exerciseDB.js";
import myScheduleRoutes from "./routes/mySchedule.js";
import saveWorkoutRoutes from "./routes/saveWorkout.js";

const app = express();

connectDB();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));

app.use(express.json());
app.use(morgan("dev"));

app.use("/api/exercisedb", exerciseDBRoutes);
app.use("/api/myschedule", myScheduleRoutes);
app.use("/api/saveworkout", saveWorkoutRoutes);



app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/protected", requireAuth, (req, res) => {
  res.json({ message: "authenticated", user: req.user });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));