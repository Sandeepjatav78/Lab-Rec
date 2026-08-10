import mongoose from "mongoose";

const equipmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, default: 1, min: 1 },
    unit: { type: String, trim: true, default: "pcs" },
  },
  { _id: false }
);

const labSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    equipment: { type: [equipmentSchema], default: [] },
  },
  { timestamps: true }
);

labSchema.virtual("chemicals", {
  ref: "Chemical",
  localField: "_id",
  foreignField: "lab",
  count: true,
});

labSchema.set("toJSON", { virtuals: true });

export default mongoose.model("Lab", labSchema);
