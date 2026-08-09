import { useState } from "react";
import Modal from "./Modal.jsx";
import ChemicalAutocomplete from "./ChemicalAutocomplete.jsx";

const HAZARDS = [
  { value: "none", label: "None" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const HAZARD_CLASS = {
  none: "badge-muted",
  low: "badge-success",
  medium: "badge-warning",
  high: "badge-danger",
};

export const HazardBadge = ({ level }) => {
  const h = HAZARDS.find((x) => x.value === level) || HAZARDS[0];
  return <span className={`badge ${HAZARD_CLASS[level] || "badge-muted"}`}>{h.label}</span>;
};

export default function ChemicalFormModal({ chemical, labs, onSave, onClose }) {
  const [form, setForm] = useState({
    name: chemical?.name || "",
    formula: chemical?.formula || "",
    casNumber: chemical?.casNumber || "",
    quantity: chemical?.quantity ?? "",
    unit: chemical?.unit || "g",
    hazard: chemical?.hazard || "none",
    storage: chemical?.storage || "",
    notes: chemical?.notes || "",
    lab: chemical?.lab?._id || chemical?.lab || labs[0]?._id || "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [autofilled, setAutofilled] = useState(null);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const onAutofill = (info) => {
    setForm({
      ...form,
      name: info.name || form.name,
      formula: info.formula || form.formula,
      casNumber: info.cas || form.casNumber,
    });
    setAutofilled(info);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError("Chemical name is required");
    if (!form.lab) return setError("Please assign the chemical to a lab");
    if (form.quantity !== "" && (isNaN(form.quantity) || Number(form.quantity) < 0))
      return setError("Quantity must be a positive number");
    setSaving(true);
    setError("");
    try {
      await onSave({
        ...form,
        quantity: form.quantity === "" ? 0 : Number(form.quantity),
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={chemical ? "Edit Chemical" : "Add Chemical"} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form-field" style={{ marginBottom: 14 }}>
          <label className="form-label">Find chemical on PubChem (auto-fill)</label>
          <ChemicalAutocomplete
            onPick={onAutofill}
            placeholder="Type a chemical name… e.g. Sodium chloride"
          />
          {autofilled && (
            <div className="ac-hint" style={{ marginTop: 6 }}>
              {autofilled.extra && autofilled.extra !== autofilled.name
                ? `Auto-filled from PubChem: ${autofilled.extra}${autofilled.weight ? ` · ${autofilled.weight}` : ""}`
                : autofilled.formula
                  ? `Auto-filled from PubChem (${autofilled.formula})`
                  : "Auto-filled from PubChem"}
            </div>
          )}
        </div>
        <div className="form-grid">
          <div className="form-field full">
            <label className="form-label">Chemical name *</label>
            <input
              value={form.name}
              onChange={set("name")}
              placeholder="e.g. Sodium Chloride"
              autoFocus
            />
          </div>
          <div className="form-field">
            <label className="form-label">Formula</label>
            <input value={form.formula} onChange={set("formula")} placeholder="e.g. NaCl" />
          </div>
          <div className="form-field">
            <label className="form-label">CAS number</label>
            <input value={form.casNumber} onChange={set("casNumber")} placeholder="e.g. 7647-14-5" />
          </div>
          <div className="form-field">
            <label className="form-label">Quantity</label>
            <input
              type="number"
              min="0"
              step="any"
              value={form.quantity}
              onChange={set("quantity")}
              placeholder="e.g. 500"
            />
          </div>
          <div className="form-field">
            <label className="form-label">Unit</label>
            <select value={form.unit} onChange={set("unit")}>
              {["g", "kg", "mL", "L", "mol", "pcs"].map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Lab *</label>
            <select value={form.lab} onChange={set("lab")}>
              {labs.length === 0 && <option value="">No labs — create one first</option>}
              {labs.map((l) => (
                <option key={l._id} value={l._id}>{l.name}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Hazard level</label>
            <select value={form.hazard} onChange={set("hazard")}>
              {HAZARDS.map((h) => (
                <option key={h.value} value={h.value}>{h.label}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Storage condition</label>
            <input
              value={form.storage}
              onChange={set("storage")}
              placeholder="e.g. Refrigerated, fume hood"
            />
          </div>
          <div className="form-field full">
            <label className="form-label">Notes</label>
            <textarea
              value={form.notes}
              onChange={set("notes")}
              rows="2"
              placeholder="Optional notes"
            />
          </div>
        </div>
        {error && <p className="error-text">{error}</p>}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : chemical ? "Save changes" : "Add chemical"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
