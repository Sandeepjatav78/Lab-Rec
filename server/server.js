import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import labsRouter from "./routes/labs.js";
import chemicalsRouter from "./routes/chemicals.js";
import requirementsRouter from "./routes/requirements.js";
import authRouter, { verifyAuth } from "./routes/auth.js";
import importRouter from "./routes/import.js";
import experimentsRouter from "./routes/experiments.js";

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/lab-rec";

app.use(cors());
app.use(express.json({ limit: "30mb" }));

app.use("/api/auth", authRouter);
app.use("/api/labs", verifyAuth, labsRouter);
app.use("/api/chemicals", verifyAuth, chemicalsRouter);
app.use("/api/requirements", verifyAuth, requirementsRouter);
app.use("/api/import", verifyAuth, importRouter);
app.use("/api/experiments", verifyAuth, experimentsRouter);

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.get("/", (_req, res) =>
  res.json({ status: "ok", service: "Lab-Rec API" })
);

app.use((_req, res) => res.status(404).json({ message: "Route not found" }));

export default app;

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection failed:", err.message));

if (!process.env.VERCEL) {
  const server = app.listen(PORT, () =>
    console.log(`API server on http://localhost:${PORT}`)
  );
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `\nPort ${PORT} is already in use — is the server already running?\n` +
          `Find and stop it with:  lsof -i :${PORT}   (then kill the PID)\n` +
          `Or use:  npm run stop   from the project root.\n`
      );
    } else {
      console.error("Server error:", err.message);
    }
    process.exit(1);
  });
}
