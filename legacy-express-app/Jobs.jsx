import React, { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "../api.js";

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  date: today(),
  client_id: "",
  description: "",
  charge: "",
  paid: false,
  payment_method: "cash",
};

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() }; // month = 0-indexed
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [j, c] = await Promise.all([api.getJobs(), api.getClients()]);
      setJobs(j);
      setClients(c);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Running total: only paid jobs count
  const runningTotal = useMemo(() => jobs.filter((j) => j.paid).reduce((sum, j) => sum + j.charge, 0), [jobs]);

  function openAdd(prefillDate) {
    setEditingId(null);
    setForm({ ...emptyForm, date: prefillDate || today() });
    setModalOpen(true);
  }

  function openEdit(job) {
    setEditingId(job.id);
    setForm({
      date: job.date,
      client_id: String(job.client_id),
      description: job.description,
      charge: job.charge,
      paid: !!job.paid,
      payment_method: job.payment_method || "cash",
    });
    setModalOpen(true);
  }

  // VLOOKUP-style auto-fill: when client changes and charge is untouched, pull their roster price
  function handleClientChange(clientId) {
    const client = clients.find((c) => String(c.id) === String(clientId));
    setForm((f) => ({
      ...f,
      client_id: clientId,
      charge: client ? client.price : f.charge,
      description: f.description || (client ? `${client.frequency} mow` : ""),
    }));
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.client_id) {
      setError("Please select a client.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      const payload = { ...form, payment_method: form.paid ? form.payment_method : "" };
      if (editingId) {
        await api.updateJob(editingId, payload);
      } else {
        await api.createJob(payload);
      }
      setModalOpen(false);
      await load();
    } catch (e2) {
      setError(e2.message);
    } finally {
      setSaving(false);
    }
  }

  async function togglePaid(job) {
    try {
      await api.updateJob(job.id, {
        paid: job.paid ? 0 : 1,
        payment_method: job.paid ? "" : job.payment_method || "cash",
      });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this job?")) return;
    try {
      await api.deleteJob(id);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Jobs</h1>
          <p className="page-subtitle">Running total (paid only): ${runningTotal.toFixed(2)}</p>
        </div>
        <button className="btn btn-primary" onClick={() => openAdd()}>
          + Add Job
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="section">
        <h2 className="section-title">Calendar</h2>
        <CalendarView jobs={jobs} monthCursor={monthCursor} setMonthCursor={setMonthCursor} onDayClick={openAdd} />
      </div>

      <div className="section">
        <h2 className="section-title">Job Log</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Weekday</th>
                <th>Client</th>
                <th>Description</th>
                <th>Charge</th>
                <th>Paid</th>
                <th>Method</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td>{j.date}</td>
                  <td>{j.weekday}</td>
                  <td>{j.client_name}</td>
                  <td>{j.description || "—"}</td>
                  <td>${Number(j.charge).toFixed(2)}</td>
                  <td>
                    <button
                      className={`pill ${j.paid ? "pill-paid" : "pill-unpaid"}`}
                      style={{ border: "none", cursor: "pointer" }}
                      onClick={() => togglePaid(j)}
                      title="Click to toggle paid status"
                    >
                      {j.paid ? "Paid" : "Unpaid"}
                    </button>
                  </td>
                  <td>
                    {j.paid && j.payment_method ? <span className="pill pill-method">{j.payment_method}</span> : "—"}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-sm" onClick={() => openEdit(j)}>
                        Edit
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(j.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && jobs.length === 0 && <div className="empty-state">No jobs logged yet.</div>}
        </div>
      </div>

      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingId ? "Edit Job" : "Add Job"}</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setModalOpen(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-grid">
                <div className="field">
                  <label>Date</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                </div>
                <div className="field">
                  <label>Client</label>
                  <select value={form.client_id} onChange={(e) => handleClientChange(e.target.value)} required>
                    <option value="">Select client…</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label>Description</label>
                  <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="field">
                  <label>Charge ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.charge}
                    onChange={(e) => setForm({ ...form, charge: e.target.value })}
                  />
                  <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>
                    Auto-filled from client roster price — override if needed.
                  </div>
                </div>
                <div className="checkbox-field">
                  <input
                    type="checkbox"
                    id="paid"
                    checked={form.paid}
                    onChange={(e) => setForm({ ...form, paid: e.target.checked })}
                  />
                  <label htmlFor="paid" style={{ marginBottom: 0, textTransform: "none" }}>
                    Paid?
                  </label>
                </div>
                {form.paid && (
                  <div className="field">
                    <label>Payment Method</label>
                    <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                      <option value="cash">Cash</option>
                      <option value="venmo">Venmo</option>
                      <option value="check">Check</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving…" : "Save Job"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function CalendarView({ jobs, monthCursor, setMonthCursor, onDayClick }) {
  const { year, month } = monthCursor;
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = today();

  const jobsByDate = useMemo(() => {
    const map = {};
    jobs.forEach((j) => {
      if (!map[j.date]) map[j.date] = [];
      map[j.date].push(j);
    });
    return map;
  }, [jobs]);

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function changeMonth(delta) {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }
    setMonthCursor({ year: newYear, month: newMonth });
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button className="btn btn-sm" onClick={() => changeMonth(-1)}>
          ← Prev
        </button>
        <strong>{firstOfMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</strong>
        <button className="btn btn-sm" onClick={() => changeMonth(1)}>
          Next →
        </button>
      </div>
      <div className="calendar">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="calendar-head">
            {w}
          </div>
        ))}
        {cells.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} className="calendar-cell empty" />;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayJobs = jobsByDate[dateStr] || [];
          const isToday = dateStr === todayStr;
          return (
            <div
              key={dateStr}
              className={`calendar-cell${isToday ? " today" : ""}`}
              onClick={() => onDayClick(dateStr)}
              style={{ cursor: "pointer" }}
              title="Click to add a job on this day"
            >
              <div className="calendar-daynum">{day}</div>
              {dayJobs.slice(0, 3).map((j) => (
                <span key={j.id} className="calendar-job-dot">
                  {j.client_name}
                </span>
              ))}
              {dayJobs.length > 3 && <span style={{ fontSize: 10, color: "var(--text-faint)" }}>+{dayJobs.length - 3} more</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
