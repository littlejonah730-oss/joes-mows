import React from "react";
import { NavLink, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import Clients from "./pages/Clients.jsx";
import Jobs from "./pages/Jobs.jsx";
import Notes from "./pages/Notes.jsx";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/clients", label: "Clients" },
  { to: "/jobs", label: "Jobs" },
  { to: "/notes", label: "Notes" },
];

function BrandMark() {
  return (
    <div className="brand">
      <div className="brand-mark">JM</div>
      <div className="brand-text">
        Joe's Mows LLC
        <span>Field System</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      {/* Mobile top bar */}
      <div className="top-bar">
        <BrandMark />
      </div>

      {/* Desktop sidebar */}
      <aside className="sidebar">
        <BrandMark />
        <nav>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
            >
              <span className="nav-icon" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Mobile bottom nav */}
      <nav className="bottom-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? "active" : "")}>
            <span className="nav-icon" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
