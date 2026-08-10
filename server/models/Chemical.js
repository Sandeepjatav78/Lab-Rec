import mongoose from "mongoose";

const chemicalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    formula: { type: String, trim: true, default: "" },
    casNumber: { type: String, trim: true, default: "" },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    unit: { type: String, trim: true, default: "g" },
    hazard: {
      type: String,
      enum: ["none", "low", "medium", "high"],
      default: "none",
    },
    storage: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
    lab: { type: mongoose.Schema.Types.ObjectId, ref: "Lab", required: true },
  },
  { timestamps: true }
);

chemicalSchema.index({ name: "text", formula: "text", casNumber: "text" });

export default mongoose.models.Chemical || mongoose.model("Chemical", chemicalSchema);
