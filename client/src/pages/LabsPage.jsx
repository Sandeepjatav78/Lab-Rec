import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { useToast } from "../components/Toast.jsx";
import LabFormModal from "../components/LabFormModal.jsx";
import LabDetailModal from "../components/LabDetailModal.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { IconPlus, IconCube, IconTrash, IconEdit, IconPin, IconEye, IconSearch } from "../components/Icons.jsx";

export default function LabsPage() {
  const { showToast, showError } = useToast();
  const [labs, setLabs] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [search, setSearch] = useState("");
  const [chemNames, setChemNames] = useState({});

  const load = useCallback(() => {
    api
      .getLabs()
      .then(setLabs)
      .catch((e) => showError(e.message));
    api
      .getChemicals()
      .then((cs) => {
        const index = {};
        for (const c of cs) {
          const labId = c.lab?._id || c.lab;
          if (!labId) continue;
          index[labId] = index[labId] || [];
          index[labId].push(`${c.name}${c.formula ? ` ${c.formula}` : ""} ${c.casNumber || ""}`.toLowerCase());
        }
        setChemNames(index);
      })
      .catch(() => {});
  }, [showError]);

  useEffect(load, [load]);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? (labs || []).filter((lab) =>
        (chemNames[lab._id] || []).some((n) => n.includes(q))
      )
    : labs;

  const save = async (payload) => {
    if (editing) {
      await api.updateLab(editing._id, payload);
      showToast("Lab updated");
    } else {
      await api.createLab(payload);
      showToast("Lab created");
    }
    setEditing(null);
    load();
  };

  const remove = async () => {
    try {
      await api.deleteLab(deleting._id);
      showToast("Lab deleted");
      load();
    } catch (e) {
      showError(e.message);
    }
  };

  if (labs === null) return <div className="loading">Loading…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Labs</h1>
          <p className="page-subtitle">
            Click a lab to see its available chemicals &amp; equipment
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <IconPlus size={15} /> Add lab
        </button>
      </div>

      <div className="row filter-row" style={{ marginBottom: 16 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 420, minWidth: 200 }}>
          <span className="search-icon">
            <IconSearch size={16} />
          </span>
          <input
            className="search-input"
            style={{ paddingLeft: 38 }}
            placeholder="Search chemical to find its lab…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {q && filtered.length === 0 && (
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <p className="muted">No lab has a chemical matching “{search}”.</p>
        </div>
      )}

      {filtered.length === 0 && !q ? (
        <div className="card">
          <EmptyState
            icon={<IconCube size={40} />}
            title="No labs yet"
            hint='Click "Add lab" to create your first lab, then add chemicals to it.'
          />
        </div>
      ) : (
        <div className="grid">
          {filtered.map((lab) => (
            <div
              className="card card-pad lab-card"
              key={lab._id}
              style={{ cursor: "pointer" }}
              onClick={() => setViewing(lab)}
            >
              <div className="lab-card-top">
                <div>
                  <div className="lab-card-name">{lab.name}</div>
                  {lab.location && (
                    <div className="lab-card-loc">
                      <IconPin size={13} /> {lab.location}
                    </div>
                  )}
                </div>
                <div className="lab-card-badges">
                  <span className="badge badge-accent">
                    {lab.chemicalCount} {lab.chemicalCount === 1 ? "chemical" : "chemicals"}
                  </span>
                  <span className="badge badge-success">
                    {lab.equipmentCount} {lab.equipmentCount === 1 ? "equip" : "equipment"}
                  </span>
                </div>
              </div>
              {lab.description && <div className="lab-card-desc">{lab.description}</div>}
              <div className="lab-card-bottom">
                <span className="muted" style={{ fontSize: 12.5 }}>
                  Created {new Date(lab.createdAt).toLocaleDateString()}
                </span>
                <div className="chem-actions" onClick={(ev) => ev.stopPropagation()}>
                  <button
                    className="btn-icon"
                    onClick={() => setViewing(lab)}
                    title="View chemicals & equipment"
                  >
                    <IconEye size={15} />
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => {
                      setEditing(lab);
                      setModalOpen(true);
                    }}
                    title="Edit lab"
                  >
                    <IconEdit size={15} />
                  </button>
                  <button
                    className="btn-icon icon-btn-danger"
                    onClick={() => setDeleting(lab)}
                    title="Delete lab"
                  >
                    <IconTrash size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <LabFormModal
          lab={editing}
          onSave={save}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete lab"
          message={`This will permanently delete "${deleting.name}" and all ${deleting.chemicalCount} chemical(s) inside it.`}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      )}
      {viewing && (
        <LabDetailModal lab={viewing} onClose={() => setViewing(null)} onSaved={load} />
      )}
    </div>
  );
}
