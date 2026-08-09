import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { HazardBadge } from "../components/ChemicalFormModal.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { IconSearch, IconPin, IconMapPin } from "../components/Icons.jsx";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [labs, setLabs] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    api.getLabs().then(setLabs).catch(() => {});
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(null);
      return;
    }
    const t = setTimeout(() => {
      api
        .getChemicals({ q })
        .then(setResults)
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const showEmptyState = query.trim() !== "" && results !== null && results.length === 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Search</h1>
          <p className="page-subtitle">
            Find any chemical and see exactly which lab holds it
          </p>
        </div>
      </div>

      <div className="search-box">
        <span className="search-icon">
          <IconSearch size={17} />
        </span>
        <input
          ref={inputRef}
          className="search-input"
          placeholder="Search by name, formula or CAS number… e.g. Sodium"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {query.trim() === "" ? (
        <div className="card">
          <EmptyState
            icon={<IconSearch size={40} />}
            title="Type to search"
            hint="Search by chemical name (e.g. Ethanol), formula (e.g. NaCl), or CAS number. Results show the lab where each chemical is stored."
          />
        </div>
      ) : results === null ? (
        <div className="loading">Searching…</div>
      ) : showEmptyState ? (
        <div className="card">
          <EmptyState
            icon={<IconSearch size={40} />}
            title={`No matches for "${query.trim()}"`}
            hint="Check the spelling, or search by formula or CAS number instead."
          />
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            {results.length} {results.length === 1 ? "match" : "matches"} for "
            {query.trim()}"
          </div>
          {results.map((c) => (
            <div className="search-result" key={c._id}>
              <div className="result-main">
                <div className="result-name">
                  {c.name}
                  {c.formula && <span className="muted">{c.formula}</span>}
                  <HazardBadge level={c.hazard} />
                </div>
                <div className="result-loc">
                  <IconMapPin size={14} />
                  <strong style={{ color: "var(--accent)" }}>{c.lab?.name || "Unassigned"}</strong>
                  {c.lab?.location && <span>· {c.lab.location}</span>}
                  {c.storage && <span>· {c.storage}</span>}
                </div>
              </div>
              <div className="chem-actions" style={{ flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                <span style={{ fontWeight: 600 }}>
                  {c.quantity} {c.unit}
                </span>
                <span className="muted" style={{ fontSize: 12 }}>
                  {c.casNumber ? `CAS ${c.casNumber}` : "No CAS"}
                </span>
              </div>
            </div>
          ))}
          <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border)" }}>
            <Link to="/chemicals" className="muted" style={{ fontSize: 13 }}>
              Can't find what you need? Add it to the inventory →
            </Link>
          </div>
        </div>
      )}

      {labs.length > 0 && query.trim() === "" && (
        <div style={{ marginTop: 20 }}>
          <div className="table-label">Browse by lab</div>
          <div className="grid">
            {labs.map((l) => (
              <div className="card card-pad lab-card" key={l._id}>
                <div className="lab-card-top">
                  <div>
                    <div className="lab-card-name">{l.name}</div>
                    {l.location && (
                      <div className="lab-card-loc">
                        <IconPin size={13} /> {l.location}
                      </div>
                    )}
                  </div>
                  <span className="badge badge-accent">{l.chemicalCount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
