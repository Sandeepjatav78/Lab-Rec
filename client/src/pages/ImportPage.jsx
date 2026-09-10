import { useRef, useState } from "react";
import { api } from "../api.js";
import { useToast } from "../components/Toast.jsx";
import {
  IconUpload,
  IconX,
  IconCheck,
  IconAlert,
  IconFlask,
} from "../components/Icons.jsx";

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ImportPage() {
  const { showToast, showError } = useToast();
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedLab, setSelectedLab] = useState("");
  const [includeStruck, setIncludeStruck] = useState(false);

  const reset = () => {
    setFileName("");
    setPreview(null);
    setResult(null);
    setSelectedLab("");
    setIncludeStruck(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = async (file) => {
    if (!file) return;
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      showError("Please choose an .xlsx or .xls file");
      return;
    }
    setResult(null);
    setBusy(true);
    try {
      const base64 = await readFileAsBase64(file);
      const data = await api.previewImport(base64);
      setFileName(file.name);
      setPreview({ base64, ...data });
      setSelectedLab("");
      setIncludeStruck(false);
    } catch (e) {
      showError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const doImportLabeled = async () => {
    setBusy(true);
    try {
      const data = await api.importExcel(preview.base64);
      setResult({ format: "labeled", rows: data.results });
      setPreview(null);
      showToast("Import completed");
    } catch (e) {
      showError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const doImportList = async () => {
    if (!selectedLab) {
      showError("Please choose which lab these chemicals belong to");
      return;
    }
    setBusy(true);
    try {
      const data = await api.importChemicalList(
        preview.base64,
        selectedLab,
        includeStruck
      );
      setResult({ format: "list", summary: data });
      setPreview(null);
      showToast(`${data.added} chemicals added to ${data.lab}`);
    } catch (e) {
      showError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const labeledTotal =
    preview?.format === "labeled"
      ? preview.sheets.reduce((sum, s) => sum + s.chemicalCount, 0)
      : 0;

  const listActiveCount =
    preview?.format === "list"
      ? preview.total - (includeStruck ? 0 : preview.struckCount)
      : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Import Excel</h1>
          <p className="page-subtitle">
            Upload a stock sheet, or a plain list of chemical names
          </p>
        </div>
      </div>

      {!fileName && (
        <div
          className={`dropzone${dragOver ? " dropzone-over" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        >
          <div className="dropzone-icon">
            <IconUpload size={28} />
          </div>
          <div className="dropzone-title">Drag &amp; drop your Excel file here</div>
          <div className="dropzone-hint">or click to browse — .xlsx / .xls</div>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            hidden
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      )}

      {busy && <div className="loading">Processing…</div>}

      {/* ---- Format A: one sheet per lab ---- */}
      {fileName && !busy && preview?.format === "labeled" && (
        <div className="card">
          <div className="card-header import-head">
            <span>
              <IconCheck size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
              {fileName}
            </span>
            <span className="badge badge-accent">
              {preview.sheets.length}{" "}
              {preview.sheets.length === 1 ? "lab" : "labs"} • {labeledTotal}{" "}
              {labeledTotal === 1 ? "chemical" : "chemicals"}
            </span>
          </div>
          <div className="card-pad">
            <div className="import-list">
              {preview.sheets.map((s) => (
                <div className="import-item" key={s.lab}>
                  <div className="import-item-name">
                    <IconFlask size={15} />
                    Lab {s.lab}
                    {s.willCreate && (
                      <span className="badge badge-success">new</span>
                    )}
                  </div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {s.chemicalCount} chemicals • {s.sample.join(", ")}
                    {s.chemicalCount > 3 && "…"}
                  </div>
                </div>
              ))}
            </div>
            <div className="import-actions">
              <button className="btn btn-primary" onClick={doImportLabeled} disabled={busy}>
                <IconCheck size={15} /> Import {labeledTotal} chemicals
              </button>
              <button className="btn btn-secondary" onClick={reset}>
                <IconX size={15} /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Format B: plain list of names -> pick a lab ---- */}
      {fileName && !busy && preview?.format === "list" && (
        <div className="card">
          <div className="card-header import-head">
            <span>
              <IconCheck size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
              {fileName}
            </span>
            <span className="badge badge-accent">
              {preview.total} {preview.total === 1 ? "name" : "names"} found
            </span>
          </div>
          <div className="card-pad">
            {preview.labs.length === 0 ? (
              <div className="import-note">
                <IconAlert size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
                You have no labs yet. Create a lab first, then import this list.
              </div>
            ) : (
              <>
                <label className="table-label" htmlFor="import-lab-select">
                  Which lab do these chemicals belong to?
                </label>
                <select
                  id="import-lab-select"
                  value={selectedLab}
                  onChange={(e) => setSelectedLab(e.target.value)}
                  style={{ width: "100%", maxWidth: 420, marginBottom: 16 }}
                >
                  <option value="">— Choose a lab —</option>
                  {preview.labs.map((l) => (
                    <option key={l._id} value={l._id}>
                      {l.name}
                      {l.location ? ` (${l.location})` : ""}
                    </option>
                  ))}
                </select>

                {preview.struckCount > 0 && (
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      marginBottom: 16,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={includeStruck}
                      onChange={(e) => setIncludeStruck(e.target.checked)}
                    />
                    Also import {preview.struckCount} crossed-out{" "}
                    {preview.struckCount === 1 ? "item" : "items"}
                  </label>
                )}

                <div className="import-list" style={{ maxHeight: 260, overflowY: "auto" }}>
                  {preview.names.map((n, i) => (
                    <div
                      className="import-item"
                      key={`${n.name}-${i}`}
                      style={
                        n.struck && !includeStruck
                          ? { opacity: 0.4, textDecoration: "line-through" }
                          : undefined
                      }
                    >
                      <div className="import-item-name">
                        <IconFlask size={15} />
                        {n.name}
                        {n.struck && (
                          <span className="badge badge-warning">crossed out</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="import-actions">
                  <button
                    className="btn btn-primary"
                    onClick={doImportList}
                    disabled={busy || !selectedLab}
                  >
                    <IconCheck size={15} /> Import {listActiveCount}{" "}
                    {listActiveCount === 1 ? "chemical" : "chemicals"}
                  </button>
                  <button className="btn btn-secondary" onClick={reset}>
                    <IconX size={15} /> Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ---- Result: labeled ---- */}
      {result?.format === "labeled" && !busy && (
        <div className="card">
          <div className="card-header">
            <IconCheck size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
            Import complete
          </div>
          <div className="card-pad">
            <div className="import-list">
              {result.rows.map((r) => (
                <div className="import-item" key={r.lab}>
                  <div className="import-item-name">
                    <IconFlask size={15} />
                    Lab {r.lab}
                    {r.created && <span className="badge badge-success">created</span>}
                  </div>
                  <div style={{ fontSize: 13 }}>
                    <span className="badge badge-success">{r.added} added</span>{" "}
                    {r.updated > 0 && (
                      <span className="badge badge-warning">{r.updated} updated</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="import-actions">
              <button className="btn btn-secondary" onClick={reset}>
                <IconUpload size={15} /> Import another file
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Result: list ---- */}
      {result?.format === "list" && !busy && (
        <div className="card">
          <div className="card-header">
            <IconCheck size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
            Import complete
          </div>
          <div className="card-pad">
            <div className="import-item">
              <div className="import-item-name">
                <IconFlask size={15} />
                Lab {result.summary.lab}
              </div>
              <div style={{ fontSize: 13 }}>
                <span className="badge badge-success">
                  {result.summary.added} added
                </span>{" "}
                {result.summary.skipped > 0 && (
                  <span className="badge badge-warning">
                    {result.summary.skipped} already existed
                  </span>
                )}
              </div>
            </div>
            <div className="import-actions">
              <button className="btn btn-secondary" onClick={reset}>
                <IconUpload size={15} /> Import another file
              </button>
            </div>
          </div>
        </div>
      )}

      {!fileName && !busy && (
        <div className="card card-pad" style={{ marginTop: 16 }}>
          <div className="import-note">
            <IconAlert size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
            Two formats are supported. <strong>Stock sheet:</strong> each sheet
            becomes a lab, names from the "Item Name" row and quantities from "Qty
            available". <strong>Name list:</strong> one chemical per row — you pick
            which lab to add them to before importing. Chemicals already in that
            lab are skipped.
          </div>
        </div>
      )}
    </div>
  );
}
