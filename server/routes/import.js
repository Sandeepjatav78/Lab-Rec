import { Router } from "express";
import Lab from "../models/Lab.js";
import Chemical from "../models/Chemical.js";
import { parseWorkbook, parseChemicalNameList } from "../utils/excelParser.js";

const router = Router();

function decodeBase64(data) {
  const base64 = String(data).trim();
  if (!/^[A-Za-z0-9+/=\s]+$/.test(base64)) return null;
  return Buffer.from(base64, "base64");
}

router.post("/preview", async (req, res) => {
  try {
    const { fileBase64 } = req.body || {};
    if (!fileBase64) {
      return res.status(400).json({ message: "No file received" });
    }
    const buffer = decodeBase64(fileBase64);
    if (!buffer) {
      return res.status(400).json({ message: "Invalid file data" });
    }
    const sheets = parseWorkbook(buffer);

    // Format A — "one sheet per lab" stock sheet (Item Name / Qty available rows).
    if (sheets.length > 0) {
      const labs = await Lab.find().select("name").lean();
      const labNames = new Set(labs.map((l) => l.name.toLowerCase()));
      return res.json({
        format: "labeled",
        sheets: sheets.map((s) => ({
          lab: s.lab,
          chemicalCount: s.chemicals.length,
          willCreate: !labNames.has(s.lab.toLowerCase()),
          sample: s.chemicals.slice(0, 3).map((c) => `${c.name} (${c.quantity}${c.unit})`),
        })),
      });
    }

    // Format B — a plain list of chemical names; user picks the target lab.
    const names = parseChemicalNameList(buffer);
    if (names.length === 0) {
      return res.status(400).json({
        message: "No chemical names found in this file.",
      });
    }
    const labs = await Lab.find().select("name location").sort({ name: 1 }).lean();
    return res.json({
      format: "list",
      total: names.length,
      struckCount: names.filter((n) => n.struck).length,
      names,
      labs: labs.map((l) => ({ _id: l._id, name: l.name, location: l.location || "" })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Import a plain list of chemical names into one chosen lab.
router.post("/list", async (req, res) => {
  try {
    const { fileBase64, lab, includeStruck } = req.body || {};
    if (!fileBase64) {
      return res.status(400).json({ message: "No file received" });
    }
    if (!lab) {
      return res.status(400).json({ message: "Please choose a lab for these chemicals" });
    }
    const labDoc = await Lab.findById(lab);
    if (!labDoc) {
      return res.status(404).json({ message: "Lab not found" });
    }
    const buffer = decodeBase64(fileBase64);
    if (!buffer) {
      return res.status(400).json({ message: "Invalid file data" });
    }

    let names = parseChemicalNameList(buffer);
    if (!includeStruck) names = names.filter((n) => !n.struck);
    if (names.length === 0) {
      return res.status(400).json({ message: "No chemicals to import" });
    }

    const existing = await Chemical.find({ lab: labDoc._id }).select("name").lean();
    const existingNames = new Set(existing.map((c) => c.name.toLowerCase()));

    const toCreate = [];
    let skipped = 0;
    for (const { name } of names) {
      const key = name.toLowerCase();
      if (existingNames.has(key)) {
        skipped++;
        continue;
      }
      existingNames.add(key);
      toCreate.push({
        name,
        quantity: 0,
        unit: "g",
        lab: labDoc._id,
        notes: "Imported from list",
      });
    }

    if (toCreate.length > 0) await Chemical.insertMany(toCreate);

    res.json({
      lab: labDoc.name,
      added: toCreate.length,
      skipped,
      total: names.length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/excel", async (req, res) => {
  try {
    const { fileBase64 } = req.body || {};
    if (!fileBase64) {
      return res.status(400).json({ message: "No file received" });
    }
    const buffer = decodeBase64(fileBase64);
    if (!buffer) {
      return res.status(400).json({ message: "Invalid file data" });
    }
    const sheets = parseWorkbook(buffer);
    if (sheets.length === 0) {
      return res.status(400).json({
        message: "No chemical data found — is this the right sheet format?",
      });
    }

    const results = [];
    for (const sheet of sheets) {
      let lab = await Lab.findOne({ name: sheet.lab });
      const created = !lab;
      if (!lab) lab = await Lab.create({ name: sheet.lab });

      const existing = await Chemical.find({ lab: lab._id }).select("name").lean();
      const existingNames = new Map(
        existing.map((c) => [c.name.toLowerCase(), c._id])
      );

      let added = 0;
      let updated = 0;
      for (const chem of sheet.chemicals) {
        const key = chem.name.toLowerCase();
        if (existingNames.has(key)) {
          await Chemical.updateOne(
            { _id: existingNames.get(key) },
            { $set: { quantity: chem.quantity, unit: chem.unit } }
          );
          updated++;
        } else {
          await Chemical.create({
            ...chem,
            lab: lab._id,
            notes: "Imported from Excel",
          });
          added++;
        }
      }

      results.push({
        lab: sheet.lab,
        created,
        added,
        updated,
        total: sheet.chemicals.length,
      });
    }

    res.json({ results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
