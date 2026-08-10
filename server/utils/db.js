import mongoose from "mongoose";

let cachedConnection = null;

export async function connectDB() {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not defined in environment variables. Please configure it in Vercel Settings."
    );
  }

  if (!cachedConnection) {
    cachedConnection = mongoose.connect(uri, {
      bufferCommands: false,
    });
  }

  try {
    await cachedConnection;
    return cachedConnection;
  } catch (err) {
    cachedConnection = null;
    throw err;
  }
}
