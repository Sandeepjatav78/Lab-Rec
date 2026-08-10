import { useState } from "react";
import Modal from "./Modal.jsx";
import { IconPlus, IconTrash } from "./Icons.jsx";

const UNITS = ["g", "kg", "mg", "mL", "L", "M", "N", "mol", "%", "drops", "pcs"];

function initForm(exp) {
  return {
    name: exp?.name || "",
    subject: exp?.subject || "",
    description: exp?.description || "",
    chemicals: (exp?.chemicals || []).map((c) => ({
      name: c.name || "",
      quantity: c.quantity ?? "",
      unit: c.unit || c.quantity !== undefined ? c.unit || "" : "",
    })),
    equipment: (exp?.equipment || []).map((e) => ({
      name: typeof e === "string" ? e : e?.name || "",
    })),
  };
}

export default function ExperimentFormModal({ experiment, onSave, onClose }) {
  const [form, setForm] = useState(() => initForm(experiment));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const setChemical = (i, k, v) => {
    const chemicals = form.chemicals.map((c, idx) =>
      idx === i ? { ...c, [k]: v } : c
    );
    setForm({ ...form, chemicals });
  };

  const addChemical = () =>
    setForm({ ...form, chemicals: [...form.chemicals, { name: "", quantity: "", unit: "" }] });

  const removeChemical = (i) =>
    setForm({ ...form, chemicals: form.chemicals.filter((_, idx) => idx !== i) });

  const setEquipment = (i, v) => {
    const equipment = form.equipment.map((e, idx) => (idx === i ? { name: v } : e));
    setForm({ ...form, equipment });
  };

  const addEquipment = () =>
    setForm({ ...form, equipment: [...form.equipment, { name: "" }] });

  const removeEquipment = (i) =>
    setForm({ ...form, equipment: form.equipment.filter((_, idx) => idx !== i) });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError("Experiment name is required");
    setSaving(true);
    setError("");
    try {
      await onSave({
        name: form.name.trim(),
        subject: form.subject.trim(),
        description: form.description.trim(),
        chemicals: form.chemicals
          .filter((c) => c.name.trim())
          .map((c) => ({
            name: c.name.trim(),
            quantity: c.quantity === "" ? 0 : Number(c.quantity),
            unit: (c.unit || "").trim(),
          })),
        equipment: form.equipment
          .map((e) => e.name.trim())
          .filter(Boolean),
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={experiment ? "Edit Experiment" : "Add Experiment"}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="form-grid">
          <div className="form-field full">
            <label className="form-label">Experiment name *</label>
            <input
              value={form.name}
              onChange={set("name")}
              placeholder="e.g. Acid-Base Titration"
              autoFocus
            />
          </div>
          <div className="form-field full">
            <label className="form-label">Subject</label>
            <input
              value={form.subject}
              onChange={set("subject")}
              placeholder="e.g. Organic Chemistry"
            />
          </div>
          <div className="form-field full">
            <label className="form-label">Description</label>
            <textarea
              value={form.description}
              onChange={set("description")}
              rows="2"
              placeholder="Short description (optional)"
            />
          </div>
        </div>

        <div className="list-editor-head">
          <span className="list-editor-title">Chemicals required</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={addChemical}>
            <IconPlus size={13} /> Add
          </button>
        </div>
        {form.chemicals.length === 0 && (
          <p className="muted" style={{ fontSize: 13, margin: "4px 0 10px" }}>
            No chemicals listed yet.
          </p>
        )}
        {form.chemicals.map((c, i) => (
          <div className="row-editor" key={i}>
            <input
              className="row-editor-name"
              value={c.name}
              onChange={(e) => setChemical(i, "name", e.target.value)}
              placeholder="Chemical name"
            />
            <input
              className="row-editor-qty"
              type="number"
              min="0"
              step="any"
              value={c.quantity}
              onChange={(e) => setChemical(i, "quantity", e.target.value)}
              placeholder="Qty"
            />
            <select
              className="row-editor-unit"
              value={c.unit}
              onChange={(e) => setChemical(i, "unit", e.target.value)}
            >
              <option value="">unit</option>
              {UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <button
              type="button"
              className="btn-icon icon-btn-danger"
              onClick={() => removeChemical(i)}
              title="Remove"
            >
              <IconTrash size={14} />
            </button>
          </div>
        ))}

        <div className="list-editor-head" style={{ marginTop: 16 }}>
          <span className="list-editor-title">Equipment required</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={addEquipment}>
            <IconPlus size={13} /> Add
          </button>
        </div>
        {form.equipment.length === 0 && (
          <p className="muted" style={{ fontSize: 13, margin: "4px 0 10px" }}>
            No equipment listed yet.
          </p>
        )}
        {form.equipment.map((eq, i) => (
          <div className="row-editor" key={i}>
            <input
              className="row-editor-name"
              value={eq.name}
              onChange={(e) => setEquipment(i, e.target.value)}
              placeholder="Equipment name"
            />
            <button
              type="button"
              className="btn-icon icon-btn-danger"
              onClick={() => removeEquipment(i)}
              title="Remove"
            >
              <IconTrash size={14} />
            </button>
          </div>
        ))}

        {error && <p className="error-text">{error}</p>}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : experiment ? "Save changes" : "Add experiment"}
          </button>
        </div>
      </form>
    </Modal>
  );
}