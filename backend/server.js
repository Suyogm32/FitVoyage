import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
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

// Reports the database too: a process manager or load balancer that only
// checks "is the port open" will happily route traffic to an instance whose
// Mongo connection has dropped. readyState 1 is connected.
app.get("/health", (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({
    status: dbUp ? "ok" : "degraded",
    db: dbUp ? "connected" : "disconnected",
  });
});

// Order matters: notFound must come after every router, errorHandler last of
// all. Express recognises the error handler by its four-argument signature.
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));