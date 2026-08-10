import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const UNIT_RE = /\b(\d+(?:\.\d+)?)\s*(mg|kg|g|gm|mL|ml|cc|L|l|lit|M|N|mol|mM|µM|uM|%|drop|drops|cm|cm3|cm³|µg|ug)\b/i;

const EQUIPMENT_KEYWORDS = [
  "beaker",
  "flask",
  "pipette",
  "burette",
  "cylinder",
  "funnel",
  "bottle",
  "stirrer",
  "hot plate",
  "hotplate",
  "thermometer",
  "test tube",
  "watch glass",
  "burner",
  "tripod",
  "stand",
  "clamp",
  "balance",
  "weighing",
  "filter paper",
  "glass rod",
  "stirring rod",
  "spatula",
  "mortar",
  "pestle",
  "water bath",
  "condenser",
  "volumetric",
  "dropper",
  "measuring",
  "crucible",
  "tongs",
  "evaporating dish",
  "conical",
  "petri",
  "slide",
  "syringe",
  "magnetic",
  "bunsen",
  "fume",
  "rack",
  "cuvette",
  "microscope",
  "centrifuge",
  "sieve",
  "tray",
  "oven",
  "slab",
  "mould",
  "buchner",
  "stoppered",
  "container",
  "tube",
];

const PROSE_SECTIONS = new Set([
  "aim",
  "objective",
  "theory",
  "procedure",
  "method",
  "observation",
  "observations",
  "precaution",
  "precautions",
  "result",
  "results",
  "pharmaceutical application",
  "pharmaceutical applications",
]);

const SECTION_KEYS = new Set([
  "chemicals",
  "chemical",
  "chemicals required",
  "material",
  "materials",
  "equipment",
  "equipments",
  "apparatus",
  "apparatus required",
  "requirements",
  "requirement",
  "materials required",
]);

const SKIP_KEYS = new Set([
  "label",
  "product name",
  "storage",
  "directions",
  "direction",
  "reference",
  "references",
]);

const KEY_RE = /^([A-Za-z][A-Za-z &()]*?)(?::|\s*[-–—]\s*)(.+)$/;
const EXPERIMENT_RE = /^(experiment|exp)\b\s*[-.:–—]?\s*\d+/i;
const BARE_SECTION_RE =
  /^(chemicals?|equipments?|apparatus|requirements?|materials required|materials|procedure|aim|objective|theory|principle|observations?|precautions?|results?|label|storage|directions?|reference|pharmaceutical applications?|chemical reaction)$/i;
const OBSERVATION_RE =
  /^observations?(\s*(&|and)\s*calculations?|\s*table\w*)?\s*[:\-–—]?/i;
const PROSE_WORDS =
  /\b(the|a|an|of|with|when|until|will|would|should|was|were|is|are|be|by|for|from|and|to|in|on|it|its|this|that|these|those|any|which|who|as|at|their|they|them)\b/gi;
const PROCEDURAL_STARTS =
  /^(measure|add|mix|weigh|place|transfer|dissolve|stir|pour|filter|heat|cool|allow|store|take|prepare|use|dry|pass|pack|incorporate|triturate|calculate|make|fill|wrap|close|label|wash|sieve|grind|melt|shake|slowly|gradually|carefully|then|now|to|of|in|on|with|the|a|an|evaluate|determine|remove|keep|avoid|ensure|report|observe|recrystallize|note)\b/i;
const TRAILING_PAGE_RE = /\s+\d+\s*([-–—]\s*\d+)?\s*$/;
const TEMP_RE = /[°º]\s*c\b/i;

function stripBullets(s) {
  return s.replace(/^\s*[\u2022•\-–—*·|—]+\s*/, "").trim();
}

function stripPrefixNumbers(s) {
  return s.replace(/^\s*(?:\d+[.).\-–—]\s*)+/, "").trim();
}

function cleanName(s) {
  return stripPrefixNumbers(s)
    .replace(/^[\s),.\-–—:]+/, "")
    .replace(/[\s(\-–—:]+$/, "")
    .replace(/[:\-–—]+$/, "")
    .replace(/\s+(of|in|with|to|the|a|an|and|by|for|on)\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanHeading(s) {
  let t = stripPrefixNumbers(s);
  t = t
    .replace(
      /^(experiment|exp|practical no\.?|practical|experiment no\.?)\s*[-.:–—]?\s*[\d\s-]+/i,
      ""
    )
    .replace(/^part\s*[ivxIVX0-9]+[:\-–—]?\s*/i, "")
    .replace(/[\s:\-–—|]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
  return t;
}

function isNoiseLine(s) {
  if (
    /^(page\s*\d+|p\.?\s*\d+|\d+\s*\/\s*\d+)$/i.test(s) ||
    /^[\d\s./-]+$/.test(s) ||
    s.length < 2
  ) {
    return true;
  }
  if (/(^|\s)\d{6}(\s|$)/.test(s)) return true;
  return false;
}

function hasEquipmentKeyword(s) {
  const lower = s.toLowerCase();
  return EQUIPMENT_KEYWORDS.some((k) => new RegExp(`\\b${k}\\b`).test(lower));
}

function splitChemicalsLine(s) {
  const re = new RegExp(UNIT_RE.source, `${UNIT_RE.flags}g`);
  const parts = [];
  let m;
  let last = 0;
  while ((m = re.exec(s)) !== null) {
    let name = s.slice(last, m.index).trim();
    last = m.index + m[0].length;
    if (!name) continue;
    parts.push({ name, quantity: Number(m[1]), unit: m[2] });
  }
  return parts;
}

function sectionKind(key) {
  if (/^chemicals?$/.test(key) || /^material/.test(key)) return "chemicals";
  if (/^(equipment|apparatus)/.test(key)) return "equipment";
  return "mixed";
}

function isNoiseHeading(s) {
  const lower = s.toLowerCase();
  if (
    /^(published by|reference:?|ref\.?|page( no)?\.?|p\.?|source|refer:|where|prepared by|checked by|approved by|guidelines|safety|dress code|compulsory|recommended)\b/i.test(
      lower
    )
  ) {
    return true;
  }
  if (/[=+×⇌→]/.test(s)) return true;
  if (TRAILING_PAGE_RE.test(s)) return true;
  if (/\.$/.test(s)) return true;
  if (/^(theoretical|practical|actual|percent)\s*yield/i.test(s)) return true;
  if (PROCEDURAL_STARTS.test(stripPrefixNumbers(s))) return true;
  if (/^(determination|estimation)\s+of\s+\w+\s+value\b/i.test(s)) return true;
  if (/^(end point|weight of|reaction|observations? table|observation table|observations?\b|results?\b|calculation\b|requirement\b)/i.test(s)) return true;
  if (
    /^(requirements?|materials required|reagents?|calculations?|theory|principle|observation\w*|label\b|results?\b|\baim\b)/i.test(
      s
    )
  ) {
    return true;
  }
  if (/^(chandigarh|jhanjeri|mohali|pharmacy college)/i.test(s)) return true;
  if (/q\.s\./i.test(s)) return true;
  if (/^sr\.?\s*no/i.test(s)) return true;
  if (TEMP_RE.test(s)) return true;
  if (PROCEDURAL_STARTS.test(s)) return true;
  const words = s.match(PROSE_WORDS) || [];
  if (words.length >= 2 && s.length >= 30) return true;
  return false;
}

function classify(line) {
  const stripped = stripBullets(line);
  if (!stripped || isNoiseLine(stripped)) return null;

  if (EXPERIMENT_RE.test(stripped)) {
    return { type: "experiment" };
  }

  if (OBSERVATION_RE.test(stripped)) {
    return { type: "description", name: "" };
  }

  const keyMatch = stripped.match(KEY_RE);
  if (keyMatch) {
    const key = keyMatch[1].toLowerCase().trim();
    const content = keyMatch[2].trim();
    if (PROSE_SECTIONS.has(key)) {
      return { type: "description", name: content };
    }
    if (SECTION_KEYS.has(key)) {
      return { type: "section", section: sectionKind(key), content };
    }
    if (SKIP_KEYS.has(key) || key === "chemical reaction") {
      return {
        type: "skip",
        skipUntil: key === "chemical reaction" ? /^procedure/i : null,
      };
    }
  }

  const bareable = stripped.replace(/[:\-–—|,.;]+\s*$/, "").trim();
  const bare = bareable.match(BARE_SECTION_RE);
  if (bare) {
    const key = bare[1].toLowerCase();
    if (SECTION_KEYS.has(key)) {
      return { type: "section", section: sectionKind(key), content: "" };
    }
    if (PROSE_SECTIONS.has(key)) return { type: "description", name: "" };
    if (key === "chemical reaction") return { type: "skip", skipUntil: /^procedure/i };
    return { type: "skip" };
  }

  if (hasEquipmentKeyword(stripped)) {
    return { type: "equipment" };
  }

  const chemicals = splitChemicalsLine(stripped);
  if (chemicals.length > 0) {
    return {
      type: "chemical",
      items: chemicals
        .map((c) => ({
          ...c,
          name: cleanName(c.name),
        }))
        .filter((c) => c.name && !PROCEDURAL_STARTS.test(c.name)),
    };
  }

  return { type: "heading" };
}

function buildExperiments(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l && !isNoiseLine(l));

  const experiments = [];
  let current = null;
  let proseMode = false;
  let skipUntil = null;
  let currentSection = null;

  const touch = () => {
    proseMode = false;
  };

  const attachChemical = (name, quantity, unit) => {
    if (!current || (proseMode && !currentSection)) return false;
    const n = cleanName(name);
    if (n && !PROCEDURAL_STARTS.test(n)) {
      current.chemicals.push({ name: n, quantity, unit });
      touch();
      return true;
    }
    return false;
  };

  const attachEquipment = (name) => {
    if (!current || (proseMode && !currentSection)) return false;
    const n = cleanName(name);
    if (n && !PROCEDURAL_STARTS.test(n)) {
      current.equipment.push(n);
      touch();
      return true;
    }
    return false;
  };

  const noteNoAttach = (raw) => {
    if (proseMode && current) {
      current.description = current.description
        ? `${current.description} ${raw}`
        : raw;
    }
  };

  const startExperiment = (rawName) => {
    let name = cleanHeading(rawName);
    if (!name) {
      const n = String(rawName).match(/\d+/);
      name = `Experiment ${n ? n[0] : ""}`.trim() || "Experiment";
    }
    current = { name, chemicals: [], equipment: [], description: "" };
    experiments.push(current);
    proseMode = false;
    currentSection = null;
  };

  const addDescription = (name) => {
    if (!current) return;
    if (name) current.description = name;
    proseMode = true;
    currentSection = null;
  };

  const applyContent = (content) => {
    if (!content) {
      proseMode = true;
      return;
    }
    let attached = false;
    const chem = splitChemicalsLine(content);
    if (chem.length > 0) {
      for (const c of chem) {
        const name = cleanName(c.name);
        if (!name || PROCEDURAL_STARTS.test(name)) continue;
        if (currentSection === "equipment") attached = attachEquipment(name) || attached;
        else attached = attachChemical(name, c.quantity, c.unit) || attached;
      }
      if (!attached) noteNoAttach(content);
      return;
    }
    const pieces = stripTrailingPunct(content)
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p);
    if (currentSection === "chemicals") {
      for (const piece of pieces) {
        const c = splitChemicalsLine(piece);
        if (c.length > 0) attached = attachChemical(c[0].name, c[0].quantity, c[0].unit) || attached;
        else attached = attachChemical(piece, 0, "") || attached;
      }
      if (!attached) noteNoAttach(content);
      return;
    }
    if (currentSection === "equipment" || pieces.some(hasEquipmentKeyword)) {
      for (const piece of pieces) {
        if (hasEquipmentKeyword(piece) || currentSection === "equipment") {
          attached = attachEquipment(piece) || attached;
        } else {
          attached = attachChemical(piece, 0, "") || attached;
        }
      }
      if (!attached) noteNoAttach(content);
      return;
    }
    addDescription(content);
  };

  const runPieces = (line) => {
    const pieces = stripTrailingPunct(line)
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p);
    let attached = false;
    for (const piece of pieces) {
      if (currentSection === "chemicals") {
        const c = splitChemicalsLine(piece);
        if (c.length > 0) attached = attachChemical(c[0].name, c[0].quantity, c[0].unit) || attached;
        else attached = attachChemical(piece, 0, "") || attached;
      } else if (currentSection === "equipment") {
        attached = attachEquipment(piece) || attached;
      } else if (hasEquipmentKeyword(piece)) {
        attached = attachEquipment(piece) || attached;
      } else {
        attached = attachChemical(piece, 0, "") || attached;
      }
    }
    if (!attached) noteNoAttach(line);
  };

  for (const line of lines) {
    if (skipUntil) {
      if (skipUntil.test(line)) skipUntil = null;
      else continue;
    }

    const item = classify(line);
    if (!item) {
      if (proseMode && current) {
        current.description = current.description
          ? `${current.description} ${line}`
          : line;
      }
      continue;
    }

    switch (item.type) {
      case "experiment":
        startExperiment(line);
        break;
      case "description":
        addDescription(item.name);
        break;
      case "section":
        proseMode = false;
        currentSection = item.section;
        applyContent(item.content);
        break;
      case "equipment":
        runPieces(line);
        break;
      case "chemical": {
        if (!item.items || item.items.length === 0) break;
        let attached = false;
        if (currentSection === "equipment") {
          for (const c of item.items) attached = attachEquipment(c.name) || attached;
        } else {
          for (const c of item.items) attached = attachChemical(c.name, c.quantity, c.unit) || attached;
        }
        if (!attached) noteNoAttach(line);
        break;
      }
      case "skip":
        if (item.skipUntil) skipUntil = item.skipUntil;
        break;
      case "heading": {
        const name = cleanHeading(line);
        if (!name || isNoiseHeading(line) || isNoiseHeading(name) || PROCEDURAL_STARTS.test(name)) break;
        if (currentSection === "chemicals") {
          attachChemical(name, 0, "");
          break;
        }
        if (proseMode && current) {
          current.description = current.description
            ? `${current.description} ${name}`
            : name;
        } else {
          current = { name, chemicals: [], equipment: [], description: "" };
          experiments.push(current);
          currentSection = null;
        }
        break;
      }
    }
  }

  return experiments
    .filter((e) => e.chemicals.length || e.equipment.length || e.description)
    .map((e) => ({
      name: e.name,
      description: e.description,
      chemicals: e.chemicals,
      equipment: [...new Set(e.equipment)],
    }));
}

function stripTrailingPunct(s) {
  return s.replace(/[.;,]+$/, "").trim();
}

export async function parsePdfBuffer(buffer) {
  const doc = await getDocument({
    data: new Uint8Array(buffer),
    verbosity: 0,
    disableFontFace: true,
  }).promise;
  let text = "";
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      for (const item of content.items) {
        text += item.str + (item.hasEOL ? "\n" : " ");
      }
      text += "\n";
    }
  } finally {
    await doc.cleanup();
  }
  return buildExperiments(text);
}