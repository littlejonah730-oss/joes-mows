import { useEffect, useState } from "react";
import { formatCurrency, formatDateShort } from "@/lib/lawnCare";
import { PiggyBank, Wallet, Building2, Info, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend,
} from "recharts";

const WEEKS_SHOWN = 6;
const STARTING_SAVINGS = 500;
const SPLIT = { savings: 0.5, personal: 0.25, business: 0.25 };

const BUCKETS = [
  { key: "savings", label: "Savings", color: "#34d399", icon: PiggyBank, description: "50% of the week's net" },
  { key: "personal", label: "Personal Spending", color: "#fbbf24", icon: Wallet, description: "25% of the week's net" },
  { key: "business", label: "Business Funds", color: "#38bdf8", icon: Building2, description: "25% back into the business" },
];

function weekStartOf(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function jobDate(job) {
  const s = job.scheduled_date;
  return new Date((typeof s === "string" && s.length === 10 ? s : s?.slice(0, 10)) + "T00:00:00");
}

function expenseDate(e) {
  const s = e.date;
  return new Date((typeof s === "string" && s.length === 10 ? s : s?.slice(0, 10)) + "T00:00:00");
}

export default function SavingsPlanner({ jobs = [], expenses = [] }) {
  // Re-check the clock periodically so the week window rolls over
  // automatically when a new week starts — even if the page stays open.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const thisWeekStart = weekStartOf(now);

  // Only employee (labor) expenses come off the gross — all other expenses
  // are deliberately ignored for allocation purposes.
  const laborExpenses = expenses.filter((e) => e.category === "labor");
  const activeJobs = jobs.filter((j) => j.status !== "cancelled");

  const weeks = [];
  for (let i = 0; i < WEEKS_SHOWN; i++) {
    const start = new Date(thisWeekStart);
    start.setDate(start.getDate() + i * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);

    const weekJobs = activeJobs.filter((j) => {
      const d = jobDate(j);
      return d >= start && d < end;
    });
    const gross = weekJobs.reduce((s, j) => s + (j.price || 0), 0);

    const weekLabor = laborExpenses
      .filter((e) => {
        const d = expenseDate(e);
        return d >= start && d < end;
      })
      .reduce((s, e) => s + (e.amount || 0), 0);

    const net = Math.max(0, gross - weekLabor);

    weeks.push({
      label: i === 0 ? "This Week" : i === 1 ? "Next Week" : `${formatDateShort(start)} – ${formatDateShort(new Date(end - 1))}`,
      shortLabel: `${formatDateShort(start)}`,
      gross,
      labor: weekLabor,
      net,
      savings: net * SPLIT.savings,
      personal: net * SPLIT.personal,
      business: net * SPLIT.business,
      jobCount: weekJobs.length,
    });
  }

  const projectedAdditions = weeks.reduce((s, w) => s + w.savings, 0);
  const projectedTotal = STARTING_SAVINGS + projectedAdditions;

  const chartData = weeks.map((w) => ({
    name: w.label,
    Savings: Math.round(w.savings),
    Personal: Math.round(w.personal),
    "Business Funds": Math.round(w.business),
  }));

  return (
    <div className="space-y-4 select-none">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground">
          Each week's <span className="text-primary font-semibold">net</span> is your scheduled job revenue minus employee (labor) expenses only —
          other expenses don't reduce what goes into each account. The net is split{" "}
          <span className="text-emerald-400 font-semibold">50% Savings</span>,{" "}
          <span className="text-amber-400 font-semibold">25% Personal</span>,{" "}
          <span className="text-sky-400 font-semibold">25% Business Funds</span>.
        </p>
      </div>

      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs font-semibold flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" /> Total Savings
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Starting balance {formatCurrency(STARTING_SAVINGS)} · rolls forward with every new week
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Starting</p>
              <p className="text-sm font-semibold text-emerald-400">{formatCurrency(STARTING_SAVINGS)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Projected Add</p>
              <p className="text-sm font-semibold text-emerald-400">+{formatCurrency(projectedAdditions)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Projected Total</p>
              <p className="text-lg font-bold text-emerald-400">{formatCurrency(projectedTotal)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-semibold mb-3">Weekly Allocation Forecast</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={0} angle={-18} textAnchor="end" height={45} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={50} />
            <Tooltip
              contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", fontSize: 12 }}
              formatter={(v) => formatCurrency(v)}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Savings" stackId="a" fill={BUCKETS[0].color} radius={[0, 0, 0, 0]} />
            <Bar dataKey="Personal" stackId="a" fill={BUCKETS[1].color} />
            <Bar dataKey="Business Funds" stackId="a" fill={BUCKETS[2].color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        {weeks.map((w, i) => (
          <div key={i} className={`rounded-xl border p-3 ${i === 0 ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
            <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
              <div>
                <p className="text-xs font-semibold">{w.label}</p>
                <p className="text-[10px] text-muted-foreground">
                  {w.jobCount} job{w.jobCount === 1 ? "" : "s"} · Gross {formatCurrency(w.gross)}
                  {w.labor > 0 && <> − Labor {formatCurrency(w.labor)}</>}
                </p>
              </div>
              <p className="text-sm font-bold">
                Net <span className="text-primary">{formatCurrency(w.net)}</span>
              </p>
            </div>
            <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
              <div style={{ width: "50%", backgroundColor: BUCKETS[0].color, opacity: w.net > 0 ? 1 : 0.2 }} />
              <div style={{ width: "25%", backgroundColor: BUCKETS[1].color, opacity: w.net > 0 ? 1 : 0.2 }} />
              <div style={{ width: "25%", backgroundColor: BUCKETS[2].color, opacity: w.net > 0 ? 1 : 0.2 }} />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div>
                <p className="text-[10px] text-muted-foreground">Savings</p>
                <p className="text-sm font-semibold text-emerald-400">{formatCurrency(w.savings)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Personal</p>
                <p className="text-sm font-semibold text-amber-400">{formatCurrency(w.personal)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Business Funds</p>
                <p className="text-sm font-semibold text-sky-400">{formatCurrency(w.business)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}