import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { useToast } from "../components/Toast.jsx";
import Modal from "../components/Modal.jsx";
import ExperimentFormModal from "../components/ExperimentFormModal.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import EmptyState from "../components/EmptyState.jsx";
import {
  IconPlus,
  IconBeaker,
  IconTrash,
  IconEdit,
  IconSearch,
  IconUpload,
  IconEye,
  IconCheck,
  IconFlask,
  IconX,
} from "../components/Icons.jsx";

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ExperimentDetail({ experiment }) {
  return (
    <div className="detail-body">
      <div className="detail-section-title">Chemicals ({experiment.chemicals.length})</div>
      {experiment.chemicals.length === 0 ? (
        <p className="muted">No chemicals listed.</p>
      ) : (
        experiment.chemicals.map((c, i) => (
          <div className="detail-row" key={i}>
            <IconFlask size={14} />
            <span className="detail-row-name">{c.name}</span>
            <span className="detail-row-qty">
              {c.quantity > 0 ? `${c.quantity} ${c.unit}` : c.unit || "—"}
            </span>
          </div>
        ))
      )}

      <div className="detail-section-title" style={{ marginTop: 18 }}>
        Equipment ({experiment.equipment.length})
      </div>
      {experiment.equipment.length === 0 ? (
        <p className="muted">No equipment listed.</p>
      ) : (
        <div className="chip-list">
          {experiment.equipment.map((e, i) => (
            <span className="chip" key={i}>
              <IconBeaker size={12} /> {e}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ExperimentsPage() {
  const { showToast, showError } = useToast();
  const inputRef = useRef(null);
  const [experiments, setExperiments] = useState(null);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [selIds, setSelIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api
      .getExperiments(search.trim())
      .then(setExperiments)
      .catch((e) => showError(e.message));
  }, [search, showError]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const handlePdf = async (file) => {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name)) {
      showError("Please choose a .pdf file");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      showError("File is too large — max 20 MB");
      return;
    }
    setBusy(true);
    try {
      const base64 = await readFileAsBase64(file);
      const data = await api.previewExperimentsPdf(base64);
      setFileName(file.name);
      setPreview({
        base64,
        experiments: data.experiments.map((e, i) => ({ ...e, __key: `pdf-${i}` })),
      });
      setSelected([]);
    } catch (e) {
      showError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const resetPdf = () => {
    setFileName("");
    setPreview(null);
    setSelected([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const toggleSelect = (key) =>
    setSelected((s) =>
      s.includes(key) ? s.filter((k) => k !== key) : [...s, key]
    );

  const toggleAll = () => {
    if (!preview) return;
    setSelected((s) =>
      s.length === preview.experiments.length
        ? []
        : preview.experiments.map((e) => e.__key)
    );
  };

  const selectedCount = selected.length;

  const applyBatchEdit = (updated) => {
    setPreview((p) => ({
      ...p,
      experiments: p.experiments.map((e) =>
        e.__key === updated.__key ? { ...e, ...updated, __key: e.__key } : updated
      ),
    }));
  };

  const batchEdit = (exp) => {
    setEditing({ ...exp, __key: exp.__key ?? exp._id, __batch: true });
    setModalOpen(true);
  };

  const doImport = async () => {
    if (!preview || selectedCount === 0) return;
    setBusy(true);
    try {
      const chosen = preview.experiments.filter((e) => selected.includes(e.__key));
      const { count, experiments } = await api.createExperimentsBulk(
        chosen.map(({ __key, ...rest }) => rest)
      );
      showToast(`${count} ${count === 1 ? "experiment" : "experiments"} imported`);
      resetPdf();
      load();
    } catch (e) {
      showError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const save = async (payload) => {
    const isBatch = editing?.__batch;
    if (isBatch) {
      applyBatchEdit({ ...payload, __key: editing.__key });
      showToast("Experiment updated in preview");
      return;
    }
    if (editing) {
      await api.updateExperiment(editing._id, payload);
      showToast("Experiment updated");
    } else {
      await api.createExperiment(payload);
      showToast("Experiment added");
    }
    setEditing(null);
    load();
  };

  const remove = async () => {
    try {
      await api.deleteExperiment(deleting._id);
      showToast("Experiment deleted");
      load();
    } catch (e) {
      showError(e.message);
    }
  };

  const toggleSelectSaved = (id) =>
    setSelIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const removeSelected = async () => {
    setBulkDeleting(true);
    try {
      const { deleted } = await api.deleteExperiments(selIds);
      showToast(`${deleted} ${deleted === 1 ? "experiment" : "experiments"} deleted`);
      setSelIds([]);
      setBulkDeleting(false);
      setDeleting(null);
      load();
    } catch (e) {
      setBulkDeleting(false);
      showError(e.message);
    }
  };

  const totalChemicals = preview
    ? preview.experiments.reduce((s, e) => s + (e.chemicals || []).length, 0)
    : 0;

  if (experiments === null) return <div className="loading">Loading…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Experiments</h1>
          <p className="page-subtitle">
            {experiments.length} {experiments.length === 1 ? "experiment" : "experiments"} —
            click one to see its chemicals &amp; equipment
          </p>
        </div>
        <div className="header-actions">
          {selIds.length > 0 && (
            <button
              className="btn btn-danger"
              onClick={() => setDeleting({ _id: "bulk", bulk: true })}
              disabled={bulkDeleting}
            >
              <IconTrash size={15} /> Delete selected ({selIds.length})
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
            <IconPlus size={15} /> Add experiment
          </button>
        </div>
      </div>

      <div style={{ position: "relative", marginBottom: 16, maxWidth: 420, minWidth: 200 }}>
        <span className="search-icon">
          <IconSearch size={16} />
        </span>
        <input
          className="search-input"
          style={{ paddingLeft: 38 }}
          placeholder="Filter experiments…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {!fileName && !busy && (
        <div
          className={`dropzone${dragOver ? " dropzone-over" : ""}`}
          style={{ marginBottom: 20 }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handlePdf(e.dataTransfer.files?.[0]);
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        >
          <div className="dropzone-icon">
            <IconUpload size={28} />
          </div>
          <div className="dropzone-title">Upload experiment list (PDF)</div>
          <div className="dropzone-hint">
            or click to browse — .pdf • experiments, chemicals &amp; equipment are detected
            automatically
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            hidden
            onChange={(e) => handlePdf(e.target.files?.[0])}
          />
        </div>
      )}

      {busy && <div className="loading">Processing PDF…</div>}

      {fileName && !busy && preview && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header import-head">
            <span>
              <IconCheck size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
              {fileName}
            </span>
            <span className="badge badge-accent">
              {preview.experiments.length}{" "}
              {preview.experiments.length === 1 ? "experiment" : "experiments"} •{" "}
              {totalChemicals} chemicals
            </span>
          </div>
          <div className="card-pad import-note">
            <IconFlask
              size={15}
              style={{ verticalAlign: "-2px", marginRight: 6 }}
            />
            {preview.experiments.length}{" "}
            {preview.experiments.length === 1
              ? "experiment found"
              : "experiments found"}{" "}
            in the PDF. Tick the ones you need — only the selected experiments are
            added. Click a row to see its requirements first.
          </div>
          <div className="card-pad">
            {preview.experiments.map((e, i) => {
              const isSel = selected.includes(e.__key);
              return (
                <div
                  className={`import-item import-item-select${isSel ? " selected" : ""}`}
                  key={e.__key}
                >
                  <input
                    type="checkbox"
                    checked={isSel}
                    onChange={() => toggleSelect(e.__key)}
                    title="Select experiment"
                  />
                  <div
                    className="import-item-name"
                    style={{ cursor: "pointer", flex: 1 }}
                    onClick={() => setViewing(e)}
                  >
                    <IconBeaker size={15} />
                    {e.name || `Experiment ${i + 1}`}
                    {!e.name && <span className="badge badge-warning">name missing</span>}
                    <span className="muted" style={{ fontWeight: 400, fontSize: 12.5 }}>
                      {" "}
                      • {(e.chemicals || []).length} chemicals,{" "}
                      {(e.equipment || []).length} equipment
                    </span>
                  </div>
                  <button
                    className="btn-icon"
                    title="Edit in preview"
                    onClick={() => batchEdit(e)}
                  >
                    <IconEdit size={15} />
                  </button>
                </div>
              );
            })}
            <div className="import-actions">
              <button
                className="btn btn-primary"
                onClick={doImport}
                disabled={busy || selectedCount === 0}
              >
                <IconCheck size={15} /> Import selected ({selectedCount})
              </button>
              <button className="btn btn-secondary" onClick={toggleAll}>
                {selectedCount === preview.experiments.length
                  ? "Clear selection"
                  : "Select all"}
              </button>
              <button className="btn btn-secondary" onClick={resetPdf}>
                <IconX size={15} /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {experiments.length === 0 && !search ? (
        <div className="card">
          <EmptyState
            icon={<IconBeaker size={40} />}
            title="No experiments yet"
            hint="Upload a PDF list of experiments, or click “Add experiment” to create one manually."
          />
        </div>
      ) : (
        <div className="grid">
          {experiments.map((e) => {
            const isSel = selIds.includes(e._id);
            return (
              <div
                className={`card card-pad lab-card${isSel ? " card-selected" : ""}`}
                key={e._id}
                style={{ cursor: "pointer" }}
                onClick={() => setViewing(e)}
              >
                <div className="lab-card-top">
                  <div
                    className="experiment-card-left"
                    onClick={(ev) => ev.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => toggleSelectSaved(e._id)}
                      title="Select for bulk delete"
                    />
                    <div>
                      <div className="lab-card-name">{e.name}</div>
                      {e.subject && <div className="lab-card-loc">{e.subject}</div>}
                    </div>
                  </div>
                  <span className="badge badge-accent">
                    {e.chemicalCount} chem • {e.equipmentCount} equip
                  </span>
                </div>
                {e.description && <div className="lab-card-desc">{e.description}</div>}
                <div className="lab-card-bottom">
                  <span className="muted" style={{ fontSize: 12.5 }}>
                    Added {new Date(e.createdAt).toLocaleDateString()}
                  </span>
                  <div className="chem-actions" onClick={(ev) => ev.stopPropagation()}>
                    <button
                      className="btn-icon"
                      onClick={() => setViewing(e)}
                      title="View requirements"
                    >
                      <IconEye size={15} />
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => {
                        setEditing(e);
                        setModalOpen(true);
                      }}
                      title="Edit experiment"
                    >
                      <IconEdit size={15} />
                    </button>
                    <button
                      className="btn-icon icon-btn-danger"
                      onClick={() => setDeleting(e)}
                      title="Delete experiment"
                    >
                      <IconTrash size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <ExperimentFormModal
          experiment={editing}
          onSave={save}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
        />
      )}

      {viewing && (
        <Modal title={viewing.name} onClose={() => setViewing(null)}>
          <ExperimentDetail experiment={viewing} />
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title={deleting.bulk ? "Delete selected experiments" : "Delete experiment"}
          message={
            deleting.bulk
              ? `Permanently delete ${selIds.length} selected experiment(s)?`
              : `Permanently delete "${deleting.name}"?`
          }
          onConfirm={deleting.bulk ? removeSelected : remove}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}