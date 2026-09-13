import { useMemo } from "react";
import { formatCurrency } from "@/lib/lawnCare";
import { HISTORICAL_YEARS, yearOf } from "@/lib/historical";
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, Users, Wallet } from "lucide-react";
import RevealOnScroll from "@/components/RevealOnScroll";

export default function YearlyGrowth({ invoices = [], expenses = [], allJobs = [], customers = [] }) {
  const yearlyData = useMemo(() => {
    const byYear = {};
    const activeIds = new Set(customers.filter((c) => c.active !== false).map((c) => c.id));
    const activeNames = new Set(customers.filter((c) => c.active !== false).map((c) => (c.name || "").toLowerCase()));
    HISTORICAL_YEARS.forEach((h) => {
      byYear[h.year] = { year: h.year, revenue: h.revenue, expenses: 0, customers: h.customers, jobs: h.jobs, historical: true, note: h.note };
    });
    invoices.forEach((inv) => {
      if (inv.status !== "paid") return;
      const y = yearOf(inv.paid_date || inv.due_date);
      if (y == null) return;
      if (!byYear[y]) byYear[y] = { year: y, revenue: 0, expenses: 0, customers: 0, historical: false };
      byYear[y].revenue += inv.amount || 0;
    });
    expenses.forEach((exp) => {
      const y = yearOf(exp.date);
      if (y == null) return;
      if (!byYear[y]) byYear[y] = { year: y, revenue: 0, expenses: 0, customers: 0, historical: false };
      byYear[y].expenses += exp.amount || 0;
    });
    allJobs.forEach((j) => {
      if (j.status !== "completed") return;
      const y = yearOf(j.scheduled_date);
      if (y == null) return;
      if (!byYear[y]) byYear[y] = { year: y, revenue: 0, expenses: 0, customers: 0, historical: false };
      const isActive = (j.customer_id && activeIds.has(j.customer_id)) || (j.customer_name && activeNames.has(j.customer_name.toLowerCase()));
      if (isActive) {
        if (!byYear[y]._cust) byYear[y]._cust = new Set();
        byYear[y]._cust.add(j.customer_id || j.customer_name);
      }
      byYear[y]._jobs = (byYear[y]._jobs || 0) + 1;
    });
    return Object.values(byYear)
      .map((y) => {
        const customers = y.historical ? y.customers : y._cust ? y._cust.size : 0;
        const jobs = y.historical ? (y.jobs || 0) : y._jobs || 0;
        return {
          year: y.year,
          revenue: Math.round(y.revenue),
          expenses: Math.round(y.expenses),
          profit: Math.round(y.revenue - y.expenses),
          customers,
          jobs,
          historical: y.historical,
          note: y.note,
        };
      })
      .sort((a, b) => a.year - b.year);
  }, [invoices, expenses, allJobs, customers]);

  if (yearlyData.length === 0) return null;

  return (
    <>
      <RevealOnScroll className="mb-6" placeholderHeight={360}>
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-semibold mb-1 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Yearly Growth</h2>
          <p className="text-xs text-muted-foreground mb-3">Revenue, expenses & net profit (left, $) and customers & jobs (right) by year. Historical years are entered manually.</p>
          <div className="w-full h-72 lg:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={yearlyData} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" />
                <YAxis yAxisId="money" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" tickFormatter={(v) => `$${v}`} width={56} />
                <YAxis yAxisId="count" orientation="right" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" width={32} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", fontSize: "12px" }}
                  formatter={(v, name) => (name === "Customers" || name === "Jobs" ? v : formatCurrency(v))}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} iconType="plainline" />
                <Line yAxisId="money" type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line yAxisId="money" type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line yAxisId="money" type="monotone" dataKey="profit" name="Net Profit" stroke="hsl(var(--primary))" strokeWidth={3} strokeDasharray="6 4" dot={{ r: 3 }} />
                <Line yAxisId="count" type="monotone" dataKey="customers" name="Customers" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line yAxisId="count" type="monotone" dataKey="jobs" name="Jobs" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </RevealOnScroll>

      <div className="rounded-2xl border border-border bg-card p-4 mb-6">
        <h2 className="font-semibold mb-1 flex items-center gap-2"><Wallet className="w-4 h-4 text-primary" /> Yearly Stats</h2>
        <p className="text-xs text-muted-foreground mb-4">A snapshot for each year on record.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {yearlyData.map((y) => (
            <div key={y.year} className={`rounded-xl border p-4 ${y.historical ? "border-slate-500/40 bg-slate-500/5" : "border-border bg-muted/20"}`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-lg font-bold">{y.year}</p>
                {y.historical && <span className="text-[9px] font-semibold text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded uppercase">Historical</span>}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Revenue</p>
                  <p className="font-bold text-emerald-400">{formatCurrency(y.revenue)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Expenses</p>
                  <p className="font-bold text-red-400">{formatCurrency(y.expenses)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Net Profit</p>
                  <p className={`font-bold ${y.profit >= 0 ? "text-primary" : "text-red-400"}`}>{formatCurrency(y.profit)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Customers</p>
                  <p className="font-bold flex items-center gap-1"><Users className="w-3 h-3 text-muted-foreground" />{y.customers}</p>
                </div>
              </div>
              {y.note && <p className="text-[10px] text-muted-foreground mt-3 pt-2 border-t border-border">{y.note}</p>}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}