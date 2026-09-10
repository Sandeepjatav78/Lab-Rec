import { Router } from "express";
import Chemical from "../models/Chemical.js";
import Lab from "../models/Lab.js";
import { suggestChemicals } from "../utils/similarity.js";
import { isGeminiEnabled, geminiSuggestChemicals } from "../utils/gemini.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { lab, q } = req.query;
    const filter = {};
    if (lab && lab !== "all") filter.lab = lab;
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { name: regex },
        { formula: regex },
        { casNumber: regex },
      ];
    }
    const chemicals = await Chemical.find(filter)
      .populate("lab", "name location")
      .sort({ name: 1 });
    res.json(chemicals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Related / "did you mean" chemicals — used when a search finds no exact match.
router.get("/suggestions", async (req, res) => {
  try {
    const { lab, q } = req.query;
    if (!q || !q.trim()) return res.json([]);

    const filter = {};
    if (lab && lab !== "all") filter.lab = lab;

    const chemicals = await Chemical.find(filter)
      .populate("lab", "name location")
      .limit(2000);

    const query = q.trim();
    let suggestions = [];

    if (isGeminiEnabled()) {
      try {
        suggestions = await geminiSuggestChemicals(query, chemicals, { limit: 6 });
      } catch (err) {
        console.warn("Gemini suggestion failed, using local match:", err.message);
      }
    }

    if (suggestions.length === 0) {
      suggestions = suggestChemicals(query, chemicals, { limit: 6 });
    }

    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, lab } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ message: "Chemical name is required" });
    }
    if (!lab) {
      return res.status(400).json({ message: "Please assign the chemical to a lab" });
    }
    const labDoc = await Lab.findById(lab);
    if (!labDoc) return res.status(404).json({ message: "Lab not found" });

    const chemical = await Chemical.create({ ...req.body, name: name.trim() });
    const populated = await chemical.populate("lab", "name location");
    res.status(201).json(populated);
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    if (req.body.lab) {
      const labDoc = await Lab.findById(req.body.lab);
      if (!labDoc) return res.status(404).json({ message: "Lab not found" });
    }
    const chemical = await Chemical.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("lab", "name location");
    if (!chemical) return res.status(404).json({ message: "Chemical not found" });
    res.json(chemical);
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const chemical = await Chemical.findByIdAndDelete(req.params.id);
    if (!chemical) return res.status(404).json({ message: "Chemical not found" });
    res.json({ message: "Chemical deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
