// Optional Gemini-powered chemical matching. Falls back to local string
// similarity (utils/similarity.js) whenever the key is missing or the call fails.

const API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const MAX_CANDIDATES = 400; // keep the prompt bounded

export function isGeminiEnabled() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function extractJson(text) {
  if (!text) return null;
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Ask Gemini which of the AVAILABLE chemicals are the closest relatives /
 * substitutes for `query`. Returns the matching chemical docs (as JSON) with a
 * `matchReason`, best first. Throws on any failure so the caller can fall back.
 */
export async function geminiSuggestChemicals(query, chemicals, { limit = 6 } = {}) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");

  const byId = new Map();
  const list = [];
  for (const chem of chemicals.slice(0, MAX_CANDIDATES)) {
    const id = String(chem._id);
    byId.set(id, chem);
    list.push({ id, name: chem.name, formula: chem.formula || "" });
  }
  if (list.length === 0) return [];

  const prompt = [
    "You are a lab inventory assistant. A user searched for a chemical that is NOT in the inventory.",
    "From the AVAILABLE chemicals below, pick the closest chemical relatives or safe substitutes",
    "for the search, judging by chemical identity, composition, ion/functional group, and typical lab use.",
    "",
    `Search query: "${query}"`,
    "",
    "Available chemicals (JSON):",
    JSON.stringify(list),
    "",
    `Return ONLY a JSON array, best match first, at most ${limit} items, each:`,
    '{ "id": "<id from the list>", "reason": "<why it is related, max 8 words>" }',
    "Include only genuinely related chemicals. If none are related, return [].",
  ].join("\n");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  let res;
  try {
    res = await fetch(
      `${API_ROOT}/${encodeURIComponent(DEFAULT_MODEL)}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
        }),
        signal: controller.signal,
      }
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini HTTP ${res.status}: ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  const parsed = extractJson(text);
  if (!Array.isArray(parsed)) throw new Error("Gemini returned no usable JSON");

  const out = [];
  const seen = new Set();
  for (const item of parsed) {
    const id = item && String(item.id || "");
    if (!id || seen.has(id) || !byId.has(id)) continue;
    seen.add(id);
    const chem = byId.get(id);
    const obj = typeof chem.toJSON === "function" ? chem.toJSON() : chem;
    const reason = String(item.reason || "Related chemical").trim().slice(0, 60);
    out.push({ ...obj, matchReason: reason, matchSource: "ai" });
    if (out.length >= limit) break;
  }
  return out;
}
