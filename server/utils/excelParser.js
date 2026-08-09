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
