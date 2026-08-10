import mongoose from "mongoose";

const chemicalItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, default: 0, min: 0 },
    unit: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const experimentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    subject: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    chemicals: [chemicalItemSchema],
    equipment: { type: [String], default: [] },
  },
  { timestamps: true }
);

experimentSchema.index({ name: "text", subject: "text" });

export default mongoose.model("Experiment", experimentSchema);