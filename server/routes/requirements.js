import { Router } from "express";
import Requirement from "../models/Requirement.js";
import Lab from "../models/Lab.js";
import Chemical from "../models/Chemical.js";

const router = Router();

function mondayOf(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function occurrenceDate(monday, dayOfWeek) {
  const d = new Date(monday);
  d.setDate(d.getDate() + (dayOfWeek - 1));
  return toDateStr(d);
}

router.get("/", async (req, res) => {
  try {
    const weekParam = req.query.week;
    const monday = weekParam ? mondayOf(weekParam) : mondayOf(new Date());
    const requirements = await Requirement.find()
      .populate("lab", "name location")
      .populate("materials.chemical", "name formula unit")
      .sort({ dayOfWeek: 1, time: 1 });

    const out = requirements.map((r) => {
      const date = occurrenceDate(monday, r.dayOfWeek);
      return {
        ...r.toJSON(),
        date,
        completed: r.completions.some((c) => c.date === date),
      };
    });
    res.json({ week: toDateStr(monday), requirements: out });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { lab, dayOfWeek } = req.body;
    if (!lab) return res.status(400).json({ message: "Lab is required" });
    if (!dayOfWeek || dayOfWeek < 1 || dayOfWeek > 5) {
      return res.status(400).json({ message: "Pick a day from Monday to Friday" });
    }
    const labDoc = await Lab.findById(lab);
    if (!labDoc) return res.status(404).json({ message: "Lab not found" });

    if (req.body.materials?.length) {
      for (const m of req.body.materials) {
        if (!m.chemical || !(await Chemical.findById(m.chemical))) {
          return res.status(400).json({ message: "One of the materials is not a known chemical" });
        }
      }
    }

    const requirement = await Requirement.create({
      lab,
      dayOfWeek,
      time: req.body.time?.trim() ?? "",
      materials: req.body.materials ?? [],
      notes: req.body.notes?.trim() ?? "",
    });
    res.status(201).json(requirement);
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const update = { ...req.body };
    delete update.completions;
    if (update.materials?.length) {
      for (const m of update.materials) {
        if (!m.chemical || !(await Chemical.findById(m.chemical))) {
          return res.status(400).json({ message: "One of the materials is not a known chemical" });
        }
      }
    }
    const requirement = await Requirement.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!requirement) return res.status(404).json({ message: "Requirement not found" });
    res.json(requirement);
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const requirement = await Requirement.findByIdAndDelete(req.params.id);
    if (!requirement) return res.status(404).json({ message: "Requirement not found" });
    res.json({ message: "Requirement deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/:id/complete", async (req, res) => {
  try {
    const { date } = req.body;
    if (!date) return res.status(400).json({ message: "date is required" });
    const requirement = await Requirement.findById(req.params.id);
    if (!requirement) return res.status(404).json({ message: "Requirement not found" });
    if (!requirement.completions.some((c) => c.date === date)) {
      requirement.completions.push({ date });
      await requirement.save();
    }
    res.json({ message: "Marked completed", date });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/:id/uncomplete", async (req, res) => {
  try {
    const { date } = req.body;
    if (!date) return res.status(400).json({ message: "date is required" });
    const requirement = await Requirement.findById(req.params.id);
    if (!requirement) return res.status(404).json({ message: "Requirement not found" });
    requirement.completions = requirement.completions.filter((c) => c.date !== date);
    await requirement.save();
    res.json({ message: "Completion undone", date });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
