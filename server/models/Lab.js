import mongoose from "mongoose";

const labSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
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
