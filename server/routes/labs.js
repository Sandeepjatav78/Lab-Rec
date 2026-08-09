import { Router } from "express";
import Lab from "../models/Lab.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const labs = await Lab.find().sort({ name: 1 });
    const chemicalCounts = await Lab.aggregate([
      {
        $lookup: {
          from: "chemicals",
          localField: "_id",
          foreignField: "lab",
          as: "chemicals",
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          location: 1,
          description: 1,
          createdAt: 1,
          chemicalCount: { $size: "$chemicals" },
        },
      },
    ]);
    res.json(chemicalCounts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, location, description } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ message: "Lab name is required" });
    }
    const lab = await Lab.create({
      name: name.trim(),
      location: location?.trim() ?? "",
      description: description?.trim() ?? "",
    });
    res.status(201).json({ ...lab.toJSON(), chemicalCount: 0 });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "A lab with this name already exists" });
    }
    res.status(500).json({ message: err.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const lab = await Lab.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!lab) return res.status(404).json({ message: "Lab not found" });
    res.json(lab);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const lab = await Lab.findById(req.params.id);
    if (!lab) return res.status(404).json({ message: "Lab not found" });
    const { default: Chemical } = await import("../models/Chemical.js");
    const { default: Requirement } = await import("../models/Requirement.js");
    await Chemical.deleteMany({ lab: lab._id });
    await Requirement.deleteMany({ lab: lab._id });
    await lab.deleteOne();
    res.json({ message: "Lab deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
