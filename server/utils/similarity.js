// Lightweight "did you mean / related chemical" scoring — no external deps.
// Used when a search finds no exact match, to surface chemicals that are
// actually on the shelf and close to what was asked for.

function normalize(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokens(str) {
  return normalize(str).split(" ").filter(Boolean);
}

function bigrams(str) {
  const s = str.replace(/\s+/g, "");
  const out = [];
  for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2));
  return out;
}

// Sørensen–Dice coefficient on character bigrams — tolerant of typos.
function dice(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const ba = bigrams(a);
  const bb = bigrams(b);
  if (!ba.length || !bb.length) return 0;
  const counts = new Map();
  for (const g of ba) counts.set(g, (counts.get(g) || 0) + 1);
  let overlap = 0;
  for (const g of bb) {
    const c = counts.get(g) || 0;
    if (c > 0) {
      overlap++;
      counts.set(g, c - 1);
    }
  }
  return (2 * overlap) / (ba.length + bb.length);
}

// Common leading words that identify a "family" of chemicals — a shared one of
// these is a strong signal the query and candidate are related.
const FAMILY_WORDS = new Set([
  "sodium", "potassium", "calcium", "magnesium", "ammonium", "hydrogen",
  "copper", "iron", "zinc", "silver", "lead", "barium", "lithium", "aluminium",
  "aluminum", "nickel", "cobalt", "chromium", "manganese",
  "chloride", "sulphate", "sulfate", "nitrate", "carbonate", "bicarbonate",
  "hydroxide", "oxide", "phosphate", "acetate", "bromide", "iodide", "fluoride",
  "acid", "hydrochloric", "sulphuric", "sulfuric", "nitric", "acetic", "phosphoric",
  "ethanol", "methanol", "acetone", "benzene", "toluene", "glucose",
]);

/**
 * Score a single chemical against a raw query string.
 * Returns { score: 0..1, reason: string }.
 */
export function scoreChemical(query, chem) {
  const q = normalize(query);
  if (!q) return { score: 0, reason: "" };

  const qTokens = new Set(tokens(query));
  const name = normalize(chem.name);
  const nameTokens = new Set(tokens(chem.name));
  const formula = normalize(chem.formula);
  const cas = String(chem.casNumber || "").replace(/[^0-9-]/g, "");
  const qCas = String(query).replace(/[^0-9-]/g, "");

  let score = 0;
  let reason = "Related chemical";

  // Exact CAS number match — unambiguous.
  if (cas && qCas && cas === qCas) {
    return { score: 1, reason: "Same CAS number" };
  }

  // Formula match (query typed as a formula, e.g. "NaCl").
  if (formula) {
    if (qTokens.has(formula) || q.replace(/\s+/g, "") === formula.replace(/\s+/g, "")) {
      score = Math.max(score, 0.9);
      reason = "Matching formula";
    } else {
      const fSim = dice(q, formula);
      if (fSim > 0.6) {
        score = Math.max(score, 0.6 + fSim * 0.3);
        reason = "Similar formula";
      }
    }
  }

  // Shared words — same family / anion (e.g. "Sodium …" or "… sulphate").
  const shared = [...qTokens].filter((t) => t.length > 2 && nameTokens.has(t));
  if (shared.length) {
    const union = new Set([...qTokens, ...nameTokens]).size;
    const jaccard = shared.length / union;
    score = Math.max(score, 0.5 + jaccard * 0.45);
    const family = shared.find((t) => FAMILY_WORDS.has(t)) || shared[0];
    reason =
      shared.length > 1
        ? `Shares "${shared.slice(0, 2).join('" & "')}"`
        : `Same group as "${family}"`;
  }

  // Whole-name similarity — catches spelling mistakes ("sodiam cloride").
  const nameSim = dice(q, name);
  if (nameSim >= 0.45 && nameSim >= score) {
    score = nameSim;
    reason = nameSim > 0.75 ? "Likely what you meant" : "Similar name";
  }

  return { score: Math.min(score, 1), reason };
}

/**
 * Rank a list of chemicals by relevance to `query`.
 * Returns the input chemical objects, each with `matchReason` and `matchScore`,
 * best first, above `threshold`, capped at `limit`.
 */
export function suggestChemicals(query, chemicals, { limit = 6, threshold = 0.32 } = {}) {
  const scored = [];
  for (const chem of chemicals) {
    const { score, reason } = scoreChemical(query, chem);
    if (score >= threshold) {
      scored.push({ chem, score, reason });
    }
  }
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aStock = (a.chem.quantity || 0) > 0 ? 1 : 0;
    const bStock = (b.chem.quantity || 0) > 0 ? 1 : 0;
    if (aStock !== bStock) return bStock - aStock;
    return String(a.chem.name).localeCompare(String(b.chem.name));
  });
  return scored.slice(0, limit).map(({ chem, reason, score }) => {
    const obj = typeof chem.toJSON === "function" ? chem.toJSON() : chem;
    return { ...obj, matchReason: reason, matchScore: Number(score.toFixed(3)) };
  });
}
