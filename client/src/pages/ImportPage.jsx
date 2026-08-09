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

  const reset = () => {
    setFileName("");
    setPreview(null);
    setResult(null);
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
      setPreview({ base64, sheets: data });
    } catch (e) {
      showError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const doImport = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const data = await api.importExcel(preview.base64);
      setResult(data.results);
      setPreview(null);
      showToast("Import completed");
    } catch (e) {
      showError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const totalChemicals = preview
    ? preview.sheets.reduce((sum, s) => sum + s.chemicalCount, 0)
    : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Import Excel</h1>
          <p className="page-subtitle">
            Upload the stock sheet — each sheet becomes a lab
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

      {fileName && !busy && preview && (
        <div className="card">
          <div className="card-header import-head">
            <span>
              <IconCheck size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
              {fileName}
            </span>
            <span className="badge badge-accent">
              {preview.sheets.length}{" "}
              {preview.sheets.length === 1 ? "lab" : "labs"} • {totalChemicals}{" "}
              {totalChemicals === 1 ? "chemical" : "chemicals"}
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
              <button className="btn btn-primary" onClick={doImport} disabled={busy}>
                <IconCheck size={15} /> Import {totalChemicals} chemicals
              </button>
              <button className="btn btn-secondary" onClick={reset}>
                <IconX size={15} /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {result && !busy && (
        <div className="card">
          <div className="card-header">
            <IconCheck size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
            Import complete
          </div>
          <div className="card-pad">
            <div className="import-list">
              {result.map((r) => (
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

      {!fileName && !busy && (
        <div className="card card-pad" style={{ marginTop: 16 }}>
          <div className="import-note">
            <IconAlert size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
            How it works: each sheet in the Excel file becomes a lab (e.g.{" "}
            <code>116</code>). Chemicals are read from the "Item Name" row and
            quantities from "Qty available". Existing labs/chemicals get updated,
            the rest are added.
          </div>
        </div>
      )}
    </div>
  );
}
