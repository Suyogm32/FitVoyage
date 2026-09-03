import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import connectDB from "./config/db.js";
import exerciseDBRoutes from "./routes/exerciseDB.js";
import myScheduleRoutes from "./routes/mySchedule.js";
import saveWorkoutRoutes from "./routes/saveWorkout.js";
import userRoutes from "./routes/user.js";
import progressRoutes from "./routes/progress.js";
import coachRoutes from "./routes/coach.js";
import programRoutes from "./routes/program.js";
import bodyWeightRoutes from "./routes/bodyWeight.js";
import historyRoutes from "./routes/history.js";

const app = express();

connectDB();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins, maxAge: 86400 }));

app.use(express.json());
app.use(morgan("dev"));

app.use("/api/exercisedb", exerciseDBRoutes);
app.use("/api/myschedule", myScheduleRoutes);
app.use("/api/saveworkout", saveWorkoutRoutes);
app.use("/api/user", userRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/coach", coachRoutes);
app.use("/api/program", programRoutes);
app.use("/api/bodyweight", bodyWeightRoutes);
app.use("/api/history", historyRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
