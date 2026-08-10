import mongoose from "mongoose";

const materialSchema = new mongoose.Schema({
  chemical: { type: mongoose.Schema.Types.ObjectId, ref: "Chemical", required: true },
  quantity: { type: Number, min: 0, default: 0 },
});

const requirementSchema = new mongoose.Schema(
  {
    lab: { type: mongoose.Schema.Types.ObjectId, ref: "Lab", required: true },
    dayOfWeek: { type: Number, min: 1, max: 5, required: true },
    time: { type: String, trim: true, default: "" },
    materials: { type: [materialSchema], default: [] },
    equipment: { type: [String], default: [] },
    notes: { type: String, trim: true, default: "" },
    completions: {
      type: [
        {
          date: { type: String, required: true },
          completedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.models.Requirement || mongoose.model("Requirement", requirementSchema);
