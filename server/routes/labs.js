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
          equipment: 1,
          createdAt: 1,
          chemicalCount: { $size: "$chemicals" },
          equipmentCount: { $size: { $ifNull: ["$equipment", []] } },
        },
      },
    ]);
    res.json(chemicalCounts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

function sanitizeEquipment(equipment) {
  if (!Array.isArray(equipment)) return undefined;
  return equipment
    .filter((e) => e && typeof e.name === "string" && e.name.trim())
    .map((e) => ({
      name: e.name.trim(),
      quantity: Number(e.quantity) >= 1 ? Number(e.quantity) : 1,
      unit: typeof e.unit === "string" && e.unit.trim() ? e.unit.trim() : "pcs",
    }));
}

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
      equipment: sanitizeEquipment(req.body.equipment) ?? [],
    });
    res
      .status(201)
      .json({ ...lab.toJSON(), chemicalCount: 0, equipmentCount: lab.equipment.length });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "A lab with this name already exists" });
    }
    res.status(500).json({ message: err.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.name !== undefined && !String(body.name).trim()) {
      return res.status(400).json({ message: "Lab name cannot be empty" });
    }
    if (body.location !== undefined) body.location = String(body.location).trim();
    if (body.description !== undefined) body.description = String(body.description).trim();
    if (body.equipment !== undefined) body.equipment = sanitizeEquipment(body.equipment) ?? [];
    const lab = await Lab.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    });
    if (!lab) return res.status(404).json({ message: "Lab not found" });
    res.json({ ...lab.toJSON(), equipmentCount: lab.equipment.length });
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
