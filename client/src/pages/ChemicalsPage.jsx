import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { useToast } from "../components/Toast.jsx";
import ChemicalFormModal, { HazardBadge } from "../components/ChemicalFormModal.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { IconPlus, IconFlask, IconTrash, IconEdit, IconSearch } from "../components/Icons.jsx";

export default function ChemicalsPage() {
  const { showToast, showError } = useToast();
  const [chemicals, setChemicals] = useState(null);
  const [labs, setLabs] = useState([]);
  const [labFilter, setLabFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(() => {
    const params = {};
    if (labFilter !== "all") params.lab = labFilter;
    if (search.trim()) params.q = search.trim();
    api
      .getChemicals(params)
      .then(setChemicals)
      .catch((e) => showError(e.message));
  }, [labFilter, search, showError]);

  useEffect(() => {
    api.getLabs().then(setLabs).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const save = async (payload) => {
    if (editing) {
      await api.updateChemical(editing._id, payload);
      showToast("Chemical updated");
    } else {
      await api.createChemical(payload);
      showToast("Chemical added");
    }
    setEditing(null);
    load();
  };

  const remove = async () => {
    try {
      await api.deleteChemical(deleting._id);
      showToast("Chemical deleted");
      load();
    } catch (e) {
      showError(e.message);
    }
  };

  if (chemicals === null) return <div className="loading">Loading…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Chemicals</h1>
          <p className="page-subtitle">
            {chemicals.length} {chemicals.length === 1 ? "chemical" : "chemicals"} in inventory
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <IconPlus size={15} /> Add chemical
        </button>
      </div>

      <div className="row filter-row" style={{ marginBottom: 16, gap: 12 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 420, minWidth: 200 }}>
          <span className="search-icon">
            <IconSearch size={16} />
          </span>
          <input
            className="search-input"
            style={{ paddingLeft: 38 }}
            placeholder="Filter by name, formula or CAS…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={labFilter} onChange={(e) => setLabFilter(e.target.value)}>
          <option value="all">All labs</option>
          {labs.map((l) => (
            <option key={l._id} value={l._id}>{l.name}</option>
          ))}
        </select>
      </div>

      <div className="card">
        {chemicals.length === 0 ? (
          <EmptyState
            icon={<IconFlask size={40} />}
            title="No chemicals found"
            hint={
              labs.length === 0
                ? "Create a lab first, then add chemicals to it."
                : "Try a different search or add a new chemical."
            }
          />
        ) : (
          chemicals.map((c) => (
            <div className="chem-row" key={c._id}>
              <div className="chem-info">
                <div style={{ minWidth: 0 }}>
                  <div className="chem-name">
                    {c.name}
                    {c.formula && (
                      <span className="muted" style={{ marginLeft: 8, fontWeight: 500 }}>
                        {c.formula}
                      </span>
                    )}
                  </div>
                  <div className="chem-meta">
                    {c.quantity} {c.unit}
                    {c.casNumber && ` · CAS ${c.casNumber}`}
                    {c.storage && ` · ${c.storage}`}
                  </div>
                </div>
              </div>
              <div className="chem-actions">
                <HazardBadge level={c.hazard} />
                {c.lab ? (
                  <span className="chem-lab-tag">{c.lab.name}</span>
                ) : (
                  <span className="badge badge-warning">No lab</span>
                )}
                <button
                  className="btn-icon"
                  onClick={() => {
                    setEditing(c);
                    setModalOpen(true);
                  }}
                  title="Edit chemical"
                >
                  <IconEdit size={15} />
                </button>
                <button
                  className="btn-icon icon-btn-danger"
                  onClick={() => setDeleting(c)}
                  title="Delete chemical"
                >
                  <IconTrash size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {modalOpen && (
        <ChemicalFormModal
          chemical={editing}
          labs={labs}
          onSave={save}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete chemical"
          message={`Permanently delete "${deleting.name}" from the inventory?`}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
