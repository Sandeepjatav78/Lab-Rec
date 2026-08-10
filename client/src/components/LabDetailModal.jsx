import { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import { api } from "../api.js";
import { useToast } from "./Toast.jsx";
import { HazardBadge } from "./ChemicalFormModal.jsx";
import { IconFlask, IconBeaker, IconTrash, IconPlus, IconSearch } from "./Icons.jsx";

export default function LabDetailModal({ lab, onClose, onSaved }) {
  const { showToast, showError } = useToast();
  const [chemicals, setChemicals] = useState(null);
  const [chemSearch, setChemSearch] = useState("");
  const [equipment, setEquipment] = useState(() =>
    (lab.equipment || []).map((e) => ({ ...e }))
  );
  const [newItem, setNewItem] = useState({ name: "", quantity: 1, unit: "pcs" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .getChemicals({ lab: lab._id })
      .then(setChemicals)
      .catch((e) => showError(e.message));
  }, [lab._id, showError]);

  const setItem = (k) => (e) => setNewItem({ ...newItem, [k]: e.target.value });

  const addItem = (e) => {
    e.preventDefault();
    if (!newItem.name.trim()) return;
    setEquipment([
      ...equipment,
      {
        name: newItem.name.trim(),
        quantity: Number(newItem.quantity) >= 1 ? Number(newItem.quantity) : 1,
        unit: newItem.unit.trim() || "pcs",
      },
    ]);
    setNewItem({ name: "", quantity: 1, unit: "pcs" });
  };

  const removeItem = (i) =>
    setEquipment(equipment.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    try {
      await api.updateLab(lab._id, { equipment });
      showToast("Equipment inventory updated");
      onSaved?.();
      onClose();
    } catch (e) {
      showError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={lab.name} onClose={onClose}>
      <div className="detail-body">
        {lab.location && (
          <p className="muted" style={{ margin: "0 0 6px" }}>
            {lab.location}
          </p>
        )}
        {lab.description && (
          <p className="muted" style={{ margin: "0 0 6px" }}>{lab.description}</p>
        )}

        <div className="detail-section-title">
          Available chemicals ({chemicals === null ? "…" : chemicals.length})
        </div>
        {chemicals && chemicals.length > 0 && (
          <div style={{ position: "relative", marginBottom: 8 }}>
            <span className="search-icon">
              <IconSearch size={14} />
            </span>
            <input
              className="search-input"
              style={{ paddingLeft: 32, paddingTop: 7, paddingBottom: 7 }}
              placeholder="Search chemical in this lab…"
              value={chemSearch}
              onChange={(e) => setChemSearch(e.target.value)}
            />
          </div>
        )}
        {chemicals === null ? (
          <p className="muted">Loading…</p>
        ) : chemicals.length === 0 ? (
          <p className="muted">No chemicals in this lab.</p>
        ) : (
          (() => {
            const q = chemSearch.trim().toLowerCase();
            const shown = q
              ? chemicals.filter(
                  (c) =>
                    c.name?.toLowerCase().includes(q) ||
                    c.formula?.toLowerCase().includes(q) ||
                    c.casNumber?.toLowerCase().includes(q)
                )
              : chemicals;
            if (shown.length === 0) {
              return <p className="muted">No chemical matches “{chemSearch}”.</p>;
            }
            return shown.map((c) => (
              <div className="detail-row" key={c._id}>
                <IconFlask size={14} />
                <span className="detail-row-name">
                  {c.name}
                  {c.formula && (
                    <span className="muted" style={{ marginLeft: 6, fontWeight: 500 }}>
                      {c.formula}
                    </span>
                  )}
                </span>
                <span className="detail-row-qty">
                  {c.quantity} {c.unit}
                </span>
                <HazardBadge level={c.hazard} />
              </div>
            ));
          })()
        )}

        <div className="detail-section-title">
          Available equipment ({equipment.length})
        </div>
        <form className="add-equipment-row" onSubmit={addItem}>
          <input
            value={newItem.name}
            onChange={setItem("name")}
            placeholder="e.g. Burette, beaker…"
            style={{ flex: 1, minWidth: 140 }}
          />
          <input
            type="number"
            min="1"
            value={newItem.quantity}
            onChange={setItem("quantity")}
            style={{ width: 70 }}
            title="Quantity"
          />
          <select value={newItem.unit} onChange={setItem("unit")} style={{ width: 80 }}>
            {["pcs", "set", "pairs"].map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <button type="submit" className="btn btn-primary btn-sm">
            <IconPlus size={13} /> Add
          </button>
        </form>
        {equipment.length === 0 ? (
          <p className="muted" style={{ marginTop: 8 }}>
            No equipment in this lab yet.
          </p>
        ) : (
          equipment.map((e, i) => (
            <div className="detail-row" key={i}>
              <IconBeaker size={14} />
              <span className="detail-row-name">{e.name}</span>
              <span className="detail-row-qty">
                {e.quantity} {e.unit}
              </span>
              <button
                className="btn-icon icon-btn-danger"
                onClick={() => removeItem(i)}
                title="Remove equipment"
              >
                <IconTrash size={14} />
              </button>
            </div>
          ))
        )}

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save equipment"}
          </button>
        </div>
      </div>
    </Modal>
  );
}