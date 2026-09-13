import { useState } from "react";
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import ChartCard from "@/components/intelligence/ChartCard";
import { EmptyState } from "@/components/ui/shared";
import BestCrewRanking from "@/components/employee/BestCrewRanking";
import CrewTrendChart from "@/components/employee/CrewTrendChart";
import { formatCurrency, getJobEmployeePay, getJobCrewSeconds, formatDateShort } from "@/lib/lawnCare";
import { BarChart3, TrendingUp, Clock, Timer, ChevronDown, ChevronUp } from "lucide-react";

// Employee hire-worth reports: how long yards took by yourself vs with each
// helper, and how much you actually took home per hour in each case — based
// only on completed yards with recorded time.
export default function EmployeeReportsTab({ employees = [], jobs = [] }) {
  const [expandedId, setExpandedId] = useState(null);

  const timed = jobs.filter((j) => j.status === "completed" && getJobCrewSeconds(j) > 0);

  // Yards the owner ran completely alone (no employee claimed or assigned)
  const soloJobs = timed.filter((j) => !j.claimed_by_employee_id && !j.exclusive_to_employee_id);
  const soloSecs = soloJobs.reduce((s, j) => s + getJobCrewSeconds(j), 0);
  const soloRevenue = soloJobs.reduce((s, j) => s + (j.price || 0), 0);
  const soloAvgMin = soloJobs.length > 0 ? soloSecs / soloJobs.length / 60 : null;
  const soloHourly = soloSecs > 0 ? soloRevenue / (soloSecs / 3600) : null;

  const rows = employees
    .map((emp) => {
      const helped = timed.filter((j) => j.claimed_by_employee_id === emp.id || j.exclusive_to_employee_id === emp.id);
      const secs = helped.reduce((s, j) => s + getJobCrewSeconds(j), 0);
      const revenue = helped.reduce((s, j) => s + (j.price || 0), 0);
      const labor = helped.reduce((s, j) => s + getJobEmployeePay(j), 0);
      const ownerTake = revenue - labor;
      const avgMin = helped.length > 0 ? secs / helped.length / 60 : null;
      const ownerHourly = secs > 0 ? ownerTake / (secs / 3600) : null;
      const worthPct =
        ownerHourly != null && soloHourly != null && soloHourly > 0
          ? ((ownerHourly - soloHourly) / soloHourly) * 100
          : null;
      return { emp, helped, yards: helped.length, revenue, labor, ownerTake, avgMin, ownerHourly, worthPct };
    })
    .sort((a, b) => (a.emp.active === false ? 1 : 0) - (b.emp.active === false ? 1 : 0) || b.yards - a.yards);

  const totalLabor = rows.reduce((s, r) => s + r.labor, 0);
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalTake = rows.reduce((s, r) => s + r.ownerTake, 0);

  const nameTick = { fontSize: 11, fill: "hsl(var(--foreground))" };
  const timeData = [
    ...(soloAvgMin != null ? [{ name: "You Alone", minutes: Math.round(soloAvgMin) }] : []),
    ...rows.filter((r) => r.avgMin != null).map((r) => ({ name: r.emp.name.split(" ")[0], minutes: Math.round(r.avgMin) })),
  ];
  const hourlyData = [
    ...(soloHourly != null ? [{ name: "You Alone", rate: Math.round(soloHourly) }] : []),
    ...rows.filter((r) => r.ownerHourly != null).map((r) => ({ name: r.emp.name.split(" ")[0], rate: Math.round(r.ownerHourly) })),
  ];

  // Minutes saved per yard vs doing it alone (positive = they speed you up)
  const savedData = rows
    .filter((r) => r.avgMin != null && soloAvgMin != null)
    .map((r) => ({ name: r.emp.name.split(" ")[0], saved: Math.round(soloAvgMin - r.avgMin) }));

  // Crew output by month — all completed crew yards, last 6 months
  const crewCompleted = jobs.filter((j) => j.status === "completed" && (j.claimed_by_employee_id || j.exclusive_to_employee_id));
  const trendNames = rows
    .filter((r) => crewCompleted.some((j) => j.claimed_by_employee_id === r.emp.id || j.exclusive_to_employee_id === r.emp.id))
    .map((r) => r.emp.name.split(" ")[0]);
  const trendData = [...Array(6)].map((_, i) => {
    const m = new Date();
    m.setDate(1);
    m.setMonth(m.getMonth() - 5 + i);
    const next = new Date(m.getFullYear(), m.getMonth() + 1, 1);
    const entry = { month: m.toLocaleDateString("en-US", { month: "short" }) };
    rows.forEach((r) => {
      entry[r.emp.name.split(" ")[0]] = crewCompleted.filter((j) => {
        const d = new Date((j.scheduled_date || "").slice(0, 10) + "T00:00:00");
        return d >= m && d < next && (j.claimed_by_employee_id === r.emp.id || j.exclusive_to_employee_id === r.emp.id);
      }).length;
    });
    return entry;
  });

  if (!hasTimedData(soloJobs, rows)) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No timed yards yet"
        subtitle="Complete jobs with the timer running (or a recorded time) to see solo-vs-helper reports here."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Crew Pay (timed yards)</p>
          <p className="text-xl font-bold text-red-400">{formatCurrency(totalLabor)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Revenue (crew yards)</p>
          <p className="text-xl font-bold text-emerald-400">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Your Take-Home</p>
          <p className="text-xl font-bold text-primary">{formatCurrency(totalTake)}</p>
        </div>
      </div>

      {/* Best crew ranking */}
      <BestCrewRanking rows={rows} soloAvgMin={soloAvgMin} soloHourly={soloHourly} />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Avg Time Per Yard" subtitle="You alone vs with each helper (minutes)" icon={Clock} delay={0}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={timeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" interval={0} angle={-25} textAnchor="end" height={50} tick={nameTick} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip />
              <Bar dataKey="minutes" name="Avg Minutes" radius={[4, 4, 0, 0]} animationDuration={1500}>
                {timeData.map((entry, i) => (
                  <Cell key={entry.name} fill={entry.name === "You Alone" ? "#fbbf24" : "#38bdf8"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Your Take-Home / Hr" subtitle="Alone vs with each helper" icon={TrendingUp} delay={0.1}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" interval={0} angle={-25} textAnchor="end" height={50} tick={nameTick} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip formatter={formatCurrency} />
              <Bar dataKey="rate" name="$/hr you keep" radius={[4, 4, 0, 0]} animationDuration={1500}>
                {hourlyData.map((entry) => (
                  <Cell key={entry.name} fill={entry.name === "You Alone" ? "#fbbf24" : "#10b981"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Time Saved Per Yard" subtitle="Minutes faster vs you alone" icon={Timer} delay={0.1}>
          {savedData.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">Need timed solo yards and timed helper yards to compare.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={savedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" interval={0} angle={-25} textAnchor="end" height={50} tick={nameTick} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Bar dataKey="saved" name="Minutes saved" radius={[4, 4, 0, 0]} animationDuration={1500}>
                  {savedData.map((entry) => (
                    <Cell key={entry.name} fill={entry.saved >= 0 ? "#10b981" : "#f87171"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
        <CrewTrendChart data={trendData} names={trendNames} />
      </div>

      {/* Hire-worth analysis per employee */}
      <div>
        <h2 className="font-semibold mb-1 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> Hire-Worth Analysis</h2>
        <p className="text-xs text-muted-foreground mb-4">
          How your take-home $/hr with each helper compares to working alone ({soloHourly != null ? `${formatCurrency(soloHourly)}/hr` : "no timed solo yards yet"}). Based on timed yards only.
        </p>
        <div className="space-y-3">
          {rows.map((row) => {
            const expanded = expandedId === row.emp.id;
            return (
              <div key={row.emp.id} className={`rounded-2xl border border-border bg-card p-4 ${row.emp.active === false ? "opacity-40 grayscale" : ""}`}>
                <button
                  className="w-full flex items-center justify-between gap-2 text-left"
                  onClick={() => setExpandedId(expanded ? null : row.emp.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">{row.emp.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{row.emp.name}</p>
                      <p className="text-[10px] text-muted-foreground">{row.yards} timed yard{row.yards === 1 ? "" : "s"} helped</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {row.worthPct != null ? (
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${row.worthPct >= 0 ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10"}`}>
                        {row.worthPct >= 0 ? "+" : ""}{Math.round(row.worthPct)}%
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">No timed yards</span>
                    )}
                    {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>

                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="rounded-lg bg-muted/40 p-2 text-center">
                    <p className="text-[9px] font-semibold text-muted-foreground uppercase">Avg Time</p>
                    <p className="text-sm font-bold">{row.avgMin != null ? `${Math.round(row.avgMin)} min` : "—"}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2 text-center">
                    <p className="text-[9px] font-semibold text-muted-foreground uppercase">Your $/hr</p>
                    <p className="text-sm font-bold text-primary">{row.ownerHourly != null ? formatCurrency(row.ownerHourly) : "—"}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2 text-center">
                    <p className="text-[9px] font-semibold text-muted-foreground uppercase">Their Pay</p>
                    <p className="text-sm font-bold text-red-400">{formatCurrency(row.labor)}</p>
                  </div>
                </div>

                {row.worthPct != null && (
                  <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                    {row.worthPct >= 0
                      ? `Worth it: you keep ${Math.round(row.worthPct)}% more per hour when ${row.emp.name.split(" ")[0]} is on the yard vs working alone.`
                      : `Costs you ${Math.abs(Math.round(row.worthPct))}% per hour vs working alone — but yards get done faster, which helps on packed days.`}
                  </p>
                )}

                {expanded && (
                  <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Yards they helped on</p>
                    {row.helped.length === 0 && <p className="text-xs text-muted-foreground">No timed yards yet.</p>}
                    {row.helped
                      .slice()
                      .sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date))
                      .map((job) => (
                        <div key={job.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/30">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{job.customer_name}</p>
                            <p className="text-muted-foreground">
                              {formatDateShort(job.scheduled_date)} · {Math.round(getJobCrewSeconds(job) / 60)} min
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-semibold">{formatCurrency(job.price)}</p>
                            <p className="text-[10px] text-muted-foreground">you keep {formatCurrency((job.price || 0) - getJobEmployeePay(job))}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function hasTimedData(soloJobs, rows) {
  return soloJobs.length > 0 || rows.some((r) => r.yards > 0);
}