import { Router } from "express";
import Experiment from "../models/Experiment.js";
import { parsePdfBuffer } from "../utils/pdfParser.js";

const router = Router();

function sanitizeChemicals(chemicals) {
  if (!Array.isArray(chemicals)) return [];
  return chemicals
    .filter((c) => c && typeof c.name === "string" && c.name.trim())
    .map((c) => ({
      name: c.name.trim(),
      quantity: Number(c.quantity) >= 0 ? Number(c.quantity) : 0,
      unit: typeof c.unit === "string" ? c.unit.trim() : "",
    }));
}

function sanitizeEquipment(equipment) {
  if (!Array.isArray(equipment)) return [];
  return equipment
    .filter((e) => typeof e === "string" && e.trim())
    .map((e) => e.trim());
}

function cleanBody(body) {
  const cleaned = {};
  if (body.name !== undefined) cleaned.name = String(body.name).trim();
  if (body.subject !== undefined) cleaned.subject = String(body.subject).trim();
  if (body.description !== undefined) cleaned.description = String(body.description).trim();
  if (body.chemicals !== undefined) cleaned.chemicals = sanitizeChemicals(body.chemicals);
  if (body.equipment !== undefined) cleaned.equipment = sanitizeEquipment(body.equipment);
  return cleaned;
}

router.get("/", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const filter = q
      ? {
          $or: [
            { name: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
            { subject: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
          ],
        }
      : {};
    const experiments = await Experiment.find(filter).sort({ name: 1 }).limit(500);
    res.json(
      experiments.map((e) => ({
        ...e.toJSON(),
        chemicalCount: e.chemicals.length,
        equipmentCount: e.equipment.length,
      }))
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const experiment = await Experiment.findById(req.params.id);
    if (!experiment) return res.status(404).json({ message: "Experiment not found" });
    res.json(experiment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = cleanBody(req.body);
    if (!body.name) {
      return res.status(400).json({ message: "Experiment name is required" });
    }
    const experiment = await Experiment.create(body);
    res.status(201).json(experiment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/bulk", async (req, res) => {
  try {
    const experiments = (req.body.experiments || [])
      .map(cleanBody)
      .filter((e) => e.name);
    if (experiments.length === 0) {
      return res
        .status(400)
        .json({ message: "No valid experiments found in the file" });
    }
    const saved = await Experiment.insertMany(experiments);
    res.status(201).json({ count: saved.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/preview", async (req, res) => {
  try {
    const fileBase64 = req.body.fileBase64;
    if (!fileBase64) {
      return res.status(400).json({ message: "No file provided" });
    }
    const buffer = Buffer.from(fileBase64, "base64");
    const experiments = await parsePdfBuffer(buffer);
    res.json({ total: experiments.length, experiments });
  } catch (err) {
    console.error("PDF parse error:", err.message);
    res.status(400).json({
      message:
        "Could not read text from this PDF. Make sure it is a text-based PDF (not scanned) and try again.",
    });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const body = cleanBody(req.body);
    if (body.name !== undefined && !body.name) {
      return res.status(400).json({ message: "Experiment name cannot be empty" });
    }
    const experiment = await Experiment.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    });
    if (!experiment) return res.status(404).json({ message: "Experiment not found" });
    res.json(experiment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/bulk-delete", async (req, res) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids.filter(Boolean) : [];
    if (ids.length === 0) {
      return res.status(400).json({ message: "No experiments selected" });
    }
    const result = await Experiment.deleteMany({ _id: { $in: ids } });
    res.json({ deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const experiment = await Experiment.findByIdAndDelete(req.params.id);
    if (!experiment) return res.status(404).json({ message: "Experiment not found" });
    res.json({ message: "Experiment deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;