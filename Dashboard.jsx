import React, { useEffect, useState, useCallback } from "react";
import { api } from "../api.js";

const money = (n) => `$${Number(n || 0).toFixed(2)}`;

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [growth, setGrowth] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setError("");
      const [s, g] = await Promise.all([api.getPaySummary(), api.getGrowth()]);
      setSummary(s);
      setGrowth(g);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Auto-refresh so totals stay current as jobs are marked paid elsewhere in the app
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Only paid jobs count toward totals below.</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {growth?.milestoneReached && (
        <div className="milestone-banner">
          🏆 Milestone reached — {growth.recurringTotal} recurring clients. Time to consider hiring help!
        </div>
      )}

      {loading ? (
        <div className="empty-state">Loading totals…</div>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-card accent">
              <div className="stat-label">Total Revenue</div>
              <div className="stat-value neon">{money(summary.totalRevenue)}</div>
              <div className="stat-sub">{summary.jobCount} paid jobs</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Worker Pay</div>
              <div className="stat-value">{money(summary.workerPay)}</div>
              <div className="stat-sub">{money(summary.workerRate)} / job</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">My Pay</div>
              <div className="stat-value">{money(summary.myPay)}</div>
              <div className="stat-sub">Revenue minus worker pay</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Outstanding (Unpaid)</div>
              <div className="stat-value">{money(summary.outstandingTotal)}</div>
              <div className="stat-sub">{summary.outstandingJobCount} jobs awaiting payment</div>
            </div>
          </div>

          <div className="two-col">
            <div className="card section">
              <h2 className="section-title">Payment Method Breakdown</h2>
              <BreakdownRow label="Cash" value={summary.breakdown.cash} total={summary.totalRevenue} />
              <BreakdownRow label="Venmo" value={summary.breakdown.venmo} total={summary.totalRevenue} />
              <BreakdownRow label="Check" value={summary.breakdown.check} total={summary.totalRevenue} />
              {summary.breakdown.unspecified > 0 && (
                <BreakdownRow label="Unspecified" value={summary.breakdown.unspecified} total={summary.totalRevenue} />
              )}
            </div>

            <div className="card section">
              <h2 className="section-title">Growth Tracker</h2>
              {growth && (
                <>
                  <div className="stat-sub" style={{ marginBottom: 4 }}>
                    {growth.recurringTotal} of {growth.hireMilestone} recurring clients toward "hire 1"
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${growth.progressPct}%` }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
                    <MiniStat label="Weekly" value={growth.weekly} />
                    <MiniStat label="Biweekly" value={growth.biweekly} />
                    <MiniStat label="Monthly" value={growth.monthly} />
                    <MiniStat label="One-time" value={growth.oneTime} />
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function BreakdownRow({ label, value, total }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
        <span>{label}</span>
        <span style={{ color: "var(--text-dim)" }}>
          {money(value)} · {pct}%
        </span>
      </div>
      <div className="progress-track" style={{ height: 7 }}>
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px" }}>
      <div className="stat-label" style={{ marginBottom: 4 }}>
        {label}
      </div>
      <div className="stat-value" style={{ fontSize: 20 }}>
        {value}
      </div>
    </div>
  );
}
