import { useState } from "react";
import Modal from "./Modal.jsx";

export default function LabFormModal({ lab, onSave, onClose }) {
  const [form, setForm] = useState({
    name: lab?.name || "",
    location: lab?.location || "",
    description: lab?.description || "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError("Lab name is required");
    setSaving(true);
    setError("");
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={lab ? "Edit Lab" : "Add Lab"} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form-grid">
          <div className="form-field full">
            <label className="form-label">Lab name *</label>
            <input
              value={form.name}
              onChange={set("name")}
              placeholder="e.g. Organic Chemistry Lab"
              autoFocus
            />
          </div>
          <div className="form-field">
            <label className="form-label">Location / Room</label>
            <input
              value={form.location}
              onChange={set("location")}
              placeholder="e.g. Block A, Room 204"
            />
          </div>
          <div className="form-field">
            <label className="form-label">Description</label>
            <input
              value={form.description}
              onChange={set("description")}
              placeholder="Short description"
            />
          </div>
        </div>
        {error && <p className="error-text">{error}</p>}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : lab ? "Save changes" : "Add lab"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
