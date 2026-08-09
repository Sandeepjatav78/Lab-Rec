import { useState } from "react";
import Modal from "./Modal.jsx";
import { IconPlus, IconX } from "./Icons.jsx";

const DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
];

export default function RequirementFormModal({
  requirement,
  labs,
  chemicals,
  presetDay,
  onSave,
  onClose,
}) {
  const [form, setForm] = useState(() => ({
    lab: requirement?.lab?._id || requirement?.lab || labs[0]?._id || "",
    dayOfWeek: requirement?.dayOfWeek || presetDay || 1,
    time: requirement?.time || "",
    notes: requirement?.notes || "",
    materials: requirement?.materials?.map((m) => ({
      chemical: m.chemical?._id || m.chemical,
      quantity: m.quantity || 0,
    })) || [],
    equipment: requirement?.equipment || [],
  }));
  const [pickerChem, setPickerChem] = useState(chemicals[0]?._id || "");
  const [pickerQty, setPickerQty] = useState("");
  const [pickerEq, setPickerEq] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const addMaterial = () => {
    if (!pickerChem) return;
    if (form.materials.some((m) => m.chemical === pickerChem)) return;
    setForm({
      ...form,
      materials: [
        ...form.materials,
        { chemical: pickerChem, quantity: pickerQty === "" ? 0 : Number(pickerQty) },
      ],
    });
    setPickerQty("");
  };

  const removeMaterial = (chemical) =>
    setForm({
      ...form,
      materials: form.materials.filter((m) => m.chemical !== chemical),
    });

  const addEquipment = () => {
    const name = pickerEq.trim();
    if (!name) return;
    if (form.equipment.some((e) => e.toLowerCase() === name.toLowerCase())) return;
    setForm({ ...form, equipment: [...form.equipment, name] });
    setPickerEq("");
  };

  const removeEquipment = (name) =>
    setForm({ ...form, equipment: form.equipment.filter((e) => e !== name) });

  const setQty = (chemical, qty) =>
    setForm({
      ...form,
      materials: form.materials.map((m) =>
        m.chemical === chemical ? { ...m, quantity: qty === "" ? 0 : Number(qty) } : m
      ),
    });

  const chemName = (id) => chemicals.find((c) => c._id === id)?.name || "Unknown";

  const submit = async (e) => {
    e.preventDefault();
    if (!form.lab) return setError("Please pick a lab");
    setSaving(true);
    setError("");
    try {
      await onSave({
        lab: form.lab,
        dayOfWeek: Number(form.dayOfWeek),
        time: form.time,
        notes: form.notes,
        materials: form.materials,
        equipment: form.equipment,
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const editing = Boolean(requirement);

  return (
    <Modal title={editing ? "Edit Requirement" : "Add Requirement"} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form-grid">
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
            <label className="form-label">Day *</label>
            <select value={form.dayOfWeek} onChange={set("dayOfWeek")}>
              {DAYS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Time</label>
            <input
              type="time"
              value={form.time}
              onChange={set("time")}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Notes</label>
            <input
              value={form.notes}
              onChange={set("notes")}
              placeholder="e.g. Wear gloves"
            />
          </div>
        </div>

        <div className="form-field" style={{ marginTop: 16 }}>
          <label className="form-label">Chemicals needed (from inventory)</label>
          <div className="row" style={{ gap: 8, alignItems: "stretch" }}>
            <select
              style={{ flex: 1 }}
              value={pickerChem}
              onChange={(e) => setPickerChem(e.target.value)}
            >
              {chemicals.length === 0 && <option value="">No chemicals in inventory</option>}
              {chemicals.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}{c.formula ? ` (${c.formula})` : ""}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              style={{ width: 90 }}
              placeholder="Qty"
              value={pickerQty}
              onChange={(e) => setPickerQty(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={addMaterial}
              disabled={!pickerChem}
              title="Add chemical"
            >
              <IconPlus size={14} />
            </button>
          </div>

          {form.materials.length > 0 && (
            <div className="materials-list">
              {form.materials.map((m) => {
                const chem = chemicals.find((c) => c._id === m.chemical);
                return (
                  <div className="material-chip" key={m.chemical}>
                    <span style={{ fontWeight: 600 }}>
                      {chemName(m.chemical)}
                      {chem?.formula ? <span className="muted"> {chem.formula}</span> : null}
                    </span>
                    <div className="row" style={{ gap: 6 }}>
                      <input
                        type="number"
                        min="0"
                        style={{ width: 70 }}
                        value={m.quantity}
                        onChange={(e) => setQty(m.chemical, e.target.value)}
                        title="Quantity"
                      />
                      {chem?.unit && <span className="muted">{chem.unit}</span>}
                      <button
                        type="button"
                        className="btn-icon icon-btn-danger"
                        onClick={() => removeMaterial(m.chemical)}
                        title="Remove"
                      >
                        <IconX size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="form-field" style={{ marginTop: 16 }}>
          <label className="form-label">Equipment needed</label>
          <div className="row" style={{ gap: 8, alignItems: "stretch" }}>
            <input
              style={{ flex: 1 }}
              placeholder="e.g. Bunsen burner, balance, beaker"
              value={pickerEq}
              onChange={(e) => setPickerEq(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addEquipment();
                }
              }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={addEquipment}
              disabled={!pickerEq.trim()}
              title="Add equipment"
            >
              <IconPlus size={14} />
            </button>
          </div>

          {form.equipment.length > 0 && (
            <div className="materials-list">
              {form.equipment.map((name) => (
                <div className="material-chip" key={name}>
                  <span style={{ fontWeight: 600 }}>{name}</span>
                  <button
                    type="button"
                    className="btn-icon icon-btn-danger"
                    onClick={() => removeEquipment(name)}
                    title="Remove"
                  >
                    <IconX size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="error-text">{error}</p>}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : editing ? "Save changes" : "Add requirement"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
