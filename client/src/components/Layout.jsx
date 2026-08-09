import { NavLink } from "react-router-dom";
import { useTheme } from "../context/ThemeContext.jsx";
import { IconFlask, IconHome, IconSearch, IconCube, IconSun, IconMoon, IconChart, IconMenu, IconX, IconLogout, IconUpload } from "./Icons.jsx";
import { useState } from "react";

const links = [
  { to: "/", label: "Home", icon: <IconHome size={18} />, end: true },
  { to: "/overview", label: "Overview", icon: <IconChart size={18} /> },
  { to: "/labs", label: "Labs", icon: <IconCube size={18} /> },
  { to: "/chemicals", label: "Chemicals", icon: <IconFlask size={18} /> },
  { to: "/import", label: "Import", icon: <IconUpload size={18} /> },
  { to: "/search", label: "Search", icon: <IconSearch size={18} /> },
];

function Nav({ onNavigate, onLogout }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <>
      <nav className="nav">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            onClick={onNavigate}
          >
            {l.icon}
            <span>{l.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button
          className="btn-icon"
          onClick={toggleTheme}
          title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? <IconMoon size={18} /> : <IconSun size={18} />}
        </button>
        <button
          className="btn-icon"
          onClick={onLogout}
          title="Log out"
        >
          <IconLogout size={18} />
        </button>
      </div>
    </>
  );
}

export default function Layout({ children, onLogout }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">
            <IconFlask size={18} />
          </div>
          <span className="brand-name">LabRec</span>
        </div>
        <Nav onLogout={onLogout} />
      </aside>

      {drawerOpen && (
        <div className="drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <div className="brand-logo">
                <IconFlask size={18} />
              </div>
              <span className="brand-name">LabRec</span>
              <button className="btn-icon" onClick={() => setDrawerOpen(false)} aria-label="Close menu">
                <IconX size={16} />
              </button>
            </div>
            <Nav onNavigate={() => setDrawerOpen(false)} onLogout={onLogout} />
          </aside>
        </div>
      )}

      <div className="main">
        <header className="topbar">
          <button
            className="btn-icon menu-btn"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            <IconMenu size={18} />
          </button>
          <span className="topbar-title">LabRec</span>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
