import React, { useEffect, useState, useCallback } from "react";
import { api } from "../api.js";

const emptyForm = {
  name: "",
  group: "",
  address: "",
  frequency: "weekly",
  day: "Monday",
  bagged: false,
  phone: "",
  avg_time: "",
  price: "",
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (q) => {
    try {
      setLoading(true);
      const data = await api.getClients(q);
      setClients(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => load(search), 250);
    return () => clearTimeout(timeout);
  }, [search, load]);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(client) {
    setEditingId(client.id);
    setForm({
      name: client.name,
      group: client.group_name,
      address: client.address,
      frequency: client.frequency,
      day: client.day,
      bagged: !!client.bagged,
      phone: client.phone,
      avg_time: client.avg_time,
      price: client.price,
    });
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Client name is required.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      if (editingId) {
        await api.updateClient(editingId, form);
      } else {
        await api.createClient(form);
      }
      setModalOpen(false);
      await load(search);
    } catch (e2) {
      setError(e2.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this client? Their job history will also be removed.")) return;
    try {
      await api.deleteClient(id);
      await load(search);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">{clients.length} clients on the roster</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          + Add Client
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="search-bar">
        <input
          placeholder="Search name, group, or address…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Group</th>
              <th>Frequency</th>
              <th>Day</th>
              <th>Bagged</th>
              <th>Avg Time</th>
              <th>Price</th>
              <th>Phone</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{c.address}</div>
                </td>
                <td>{c.group_name || "—"}</td>
                <td style={{ textTransform: "capitalize" }}>{c.frequency}</td>
                <td>{c.day || "—"}</td>
                <td>{c.bagged ? "Yes" : "No"}</td>
                <td>{c.avg_time ? `${c.avg_time} min` : "—"}</td>
                <td>${Number(c.price).toFixed(2)}</td>
                <td>{c.phone || "—"}</td>
                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-sm" onClick={() => openEdit(c)}>
                      Edit
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c.id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && clients.length === 0 && <div className="empty-state">No clients yet. Add your first one.</div>}
      </div>

      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingId ? "Edit Client" : "Add Client"}</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setModalOpen(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-grid">
                <div className="field">
                  <label>Name</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="field">
                  <label>Group</label>
                  <input value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })} placeholder="e.g. Oak Street" />
                </div>
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label>Address</label>
                  <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="field">
                  <label>Frequency</label>
                  <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="one-time">One-time</option>
                  </select>
                </div>
                <div className="field">
                  <label>Day</label>
                  <select value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}>
                    {DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Phone</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="field">
                  <label>Avg Time (min)</label>
                  <input
                    type="number"
                    value={form.avg_time}
                    onChange={(e) => setForm({ ...form, avg_time: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Price ($)</label>
                  <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
                <div className="checkbox-field">
                  <input
                    type="checkbox"
                    id="bagged"
                    checked={form.bagged}
                    onChange={(e) => setForm({ ...form, bagged: e.target.checked })}
                  />
                  <label htmlFor="bagged" style={{ marginBottom: 0, textTransform: "none" }}>
                    Bagged clippings
                  </label>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving…" : "Save Client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
