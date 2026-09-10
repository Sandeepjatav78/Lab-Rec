import XLSX from "xlsx";

function normalize(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return String(v).trim();
  return String(v).trim();
}

function findRow(rows, keyword) {
  return rows.findIndex(
    (row) =>
      row.length > 0 &&
      normalize(row[0]).toLowerCase().includes(keyword.toLowerCase())
  );
}

function parseQty(raw) {
  const s = normalize(raw).replace(/\s+/g, " ");
  const m = s.match(/^([\d.]+)\s*([a-zA-Z]+)/);
  if (!m) return null;
  return {
    quantity: parseFloat(m[1]),
    unit: m[2].toLowerCase().replace(/\.$/, ""),
  };
}

function sheetToChemicals(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const nameRow = findRow(rows, "Item Name");
  const qtyRow = findRow(rows, "Qty available");
  if (nameRow === -1) return [];

  const names = rows[nameRow];
  const qtys = qtyRow !== -1 ? rows[qtyRow] : [];

  const chemicals = [];
  for (let i = 1; i < names.length; i++) {
    const name = normalize(names[i]);
    if (!name) continue;
    const qty = qtys[i] !== undefined ? qtys[i] : null;
    const parsed = parseQty(qty);
    chemicals.push({
      name,
      quantity: parsed?.quantity ?? 0,
      unit: parsed?.unit ?? "g",
    });
  }
  return chemicals;
}

export function parseWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheets = [];
  for (const sheetName of workbook.SheetNames) {
    const chemicals = sheetToChemicals(workbook.Sheets[sheetName]);
    if (chemicals.length > 0) {
      sheets.push({ lab: sheetName.trim(), chemicals });
    }
  }
  return sheets;
}

// Strip bullet/dash markers and markdown strikethrough from a list entry.
function stripListMarkers(value) {
  return normalize(value)
    .replace(/^[-*•·▪◦\s]+/, "")
    .replace(/~~+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Rows that are clearly a heading, not a chemical.
const HEADER_WORDS = new Set([
  "chemical", "chemicals", "chemical list", "chemical name", "name", "item name",
  "list", "reagents", "reagent list", "inventory", "s.no", "sr.no", "sno",
]);

/**
 * Parse a plain "one chemical name per row" sheet (any number of sheets, first
 * column of each). Returns [{ name, struck }] — `struck` marks entries that were
 * crossed out with ~~...~~ in the source. Names are de-duplicated case-insensitively.
 */
export function parseChemicalNameList(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const out = [];
  const seen = new Set();
  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: "",
    });
    for (const row of rows) {
      const raw = normalize(row[0]);
      if (!raw) continue;
      const struck = /~~.+~~/.test(raw);
      const name = stripListMarkers(raw);
      if (name.length < 2) continue;
      const key = name.toLowerCase();
      if (HEADER_WORDS.has(key) || seen.has(key)) continue;
      seen.add(key);
      out.push({ name, struck });
    }
  }
  return out;
}
