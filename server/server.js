import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import labsRouter from "./routes/labs.js";
import chemicalsRouter from "./routes/chemicals.js";
import requirementsRouter from "./routes/requirements.js";

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/lab-rec";

app.use(cors());
app.use(express.json());

app.use("/api/labs", labsRouter);
app.use("/api/chemicals", chemicalsRouter);
app.use("/api/requirements", requirementsRouter);

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use((_req, res) => res.status(404).json({ message: "Route not found" }));

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
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
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
