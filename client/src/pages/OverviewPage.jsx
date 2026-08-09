import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import EmptyState from "../components/EmptyState.jsx";
import { HazardBadge } from "../components/ChemicalFormModal.jsx";
import { IconCube, IconFlask, IconAlert, IconPin, IconSearch } from "../components/Icons.jsx";

export default function OverviewPage() {
  const [labs, setLabs] = useState(null);
  const [chemicals, setChemicals] = useState([]);

  useEffect(() => {
    Promise.all([api.getLabs(), api.getChemicals()])
      .then(([l, c]) => {
        setLabs(l);
        setChemicals(c);
      })
      .catch(() => setLabs([]));
  }, []);

  if (labs === null) return <div className="loading">Loading…</div>;

  const totalChemicals = chemicals.length;
  const hazardCount = chemicals.filter((c) => c.hazard === "high").length;
  const emptyCount = chemicals.filter((c) => c.quantity === 0).length;
  const recent = [...chemicals]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Overview</h1>
          <p className="page-subtitle">Overview of your lab inventory</p>
        </div>
        <Link to="/search" className="btn btn-secondary">
          <IconSearch size={15} /> Search chemicals
        </Link>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Labs</div>
          <div className="stat-value">{labs.length}</div>
          <div className="stat-sub">
            <Link to="/labs" style={{ color: "var(--accent)" }}>Manage labs →</Link>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Chemicals</div>
          <div className="stat-value">{totalChemicals}</div>
          <div className="stat-sub">
            <Link to="/chemicals" style={{ color: "var(--accent)" }}>Manage chemicals →</Link>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">High hazard</div>
          <div className="stat-value" style={{ color: hazardCount ? "var(--danger)" : undefined }}>
            {hazardCount}
          </div>
          <div className="stat-sub">Needs careful handling</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Out of stock</div>
          <div className="stat-value">{emptyCount}</div>
          <div className="stat-sub">Quantity is zero</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">Labs</div>
          {labs.length === 0 ? (
            <EmptyState
              icon={<IconCube size={38} />}
              title="No labs yet"
              hint="Create your first lab to start organizing chemicals."
            />
          ) : (
            labs.slice(0, 4).map((lab) => (
              <div className="chem-row" key={lab._id}>
                <div className="chem-info">
                  <span className="chem-name">{lab.name}</span>
                  <span className="chem-meta">
                    {lab.location ? `at ${lab.location}` : "No location set"}
                  </span>
                </div>
                <span className="badge badge-accent">{lab.chemicalCount} chem</span>
              </div>
            ))
          )}
          {labs.length > 4 && (
            <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
              <Link to="/labs" className="muted" style={{ fontSize: 13 }}>View all labs →</Link>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">Recently added chemicals</div>
          {recent.length === 0 ? (
            <EmptyState
              icon={<IconFlask size={38} />}
              title="No chemicals yet"
              hint="Add chemicals and assign them to a lab."
            />
          ) : (
            recent.map((c) => (
              <div className="chem-row" key={c._id}>
                <div className="chem-info">
                  <span className="chem-name">{c.name}</span>
                  <span className="chem-meta">
                    {c.quantity} {c.unit}
                    {c.formula ? ` · ${c.formula}` : ""}
                  </span>
                </div>
                <div className="row">
                  <HazardBadge level={c.hazard} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
