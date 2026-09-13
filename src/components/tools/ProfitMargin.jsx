import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/lawnCare";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { PieChart, TrendingUp, TrendingDown, DollarSign, Receipt, CreditCard } from "lucide-react";

const PERIODS = [
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
  { key: "all", label: "All Time" },
];

const CATEGORY_LABELS = {
  fuel: "Fuel",
  equipment: "Equipment",
  supplies: "Supplies",
  labor: "Labor",
  other: "Other",
};

const PAYMENT_LABELS = {
  cash: "Cash",
  venmo: "Venmo",
  cashapp: "Cash App",
  check: "Check",
  none: "Unspecified",
};

const PAYMENT_COLORS = {
  cash: "#22c55e",
  venmo: "#3b82f6",
  cashapp: "#22d3ee",
  check: "#a855f7",
  none: "#6b7280",
};

export default function ProfitMargin({ invoices = [], expenses = [] }) {
  const [period, setPeriod] = useState("month");

  const data = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const inPeriod = (dateStr) => {
      if (!dateStr) return false;
      const d = typeof dateStr === "string" && dateStr.length === 10 ? new Date(dateStr + "T00:00:00") : new Date(dateStr);
      if (period === "month") return d >= startOfMonth;
      if (period === "year") return d >= startOfYear;
      return true;
    };

    const paidInvoices = invoices.filter((i) => i.status === "paid" && inPeriod(i.paid_date || i.created_date));
    const periodExpenses = expenses.filter((e) => inPeriod(e.date || e.created_date));

    const revenue = paidInvoices.reduce((s, i) => s + (i.amount || 0), 0);
    const totalExpenses = periodExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const profit = revenue - totalExpenses;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    const byCategory = {};
    periodExpenses.forEach((e) => {
      const cat = e.category || "other";
      if (!byCategory[cat]) byCategory[cat] = 0;
      byCategory[cat] += e.amount || 0;
    });

    const unpaid = invoices.filter((i) => i.status === "unpaid" && inPeriod(i.due_date || i.created_date));
    const outstanding = unpaid.reduce((s, i) => s + (i.amount || 0), 0);

    // Payment method breakdown (paid invoices only)
    const byPayment = {};
    paidInvoices.forEach((i) => {
      const method = i.payment_method || "none";
      if (!byPayment[method]) byPayment[method] = { count: 0, total: 0 };
      byPayment[method].count++;
      byPayment[method].total += i.amount || 0;
    });

    const paymentChart = Object.entries(byPayment)
      .map(([key, val]) => ({ method: key, label: PAYMENT_LABELS[key] || key, count: val.count, total: val.total, color: PAYMENT_COLORS[key] || "#6b7280" }))
      .sort((a, b) => b.count - a.count);

    return { revenue, totalExpenses, profit, margin, byCategory, outstanding, paidCount: paidInvoices.length, unpaidCount: unpaid.length, paymentChart };
  }, [invoices, expenses, period]);

  return (
    <div>
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 mb-4">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <PieChart className="w-3.5 h-3.5 text-primary" />
          Track revenue, expenses, profit margins, and payment methods.
        </p>
      </div>

      <div className="flex gap-2 mb-4">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors select-none ${
              period === p.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <p className="text-[9px] font-semibold text-muted-foreground uppercase">Revenue</p>
          </div>
          <p className="text-xl font-bold text-emerald-400">{formatCurrency(data.revenue)}</p>
          <p className="text-[10px] text-muted-foreground">{data.paidCount} paid invoices</p>
        </div>
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
            <p className="text-[9px] font-semibold text-muted-foreground uppercase">Expenses</p>
          </div>
          <p className="text-xl font-bold text-red-400">{formatCurrency(data.totalExpenses)}</p>
          <p className="text-[10px] text-muted-foreground">{Object.keys(data.byCategory).length} categories</p>
        </div>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-4 text-center">
        <p className="text-[9px] font-semibold text-muted-foreground uppercase mb-1">Net Profit</p>
        <p className={`text-2xl font-bold ${data.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatCurrency(data.profit)}</p>
        <p className="text-xs text-muted-foreground mt-1">Margin: <span className={`font-bold ${data.margin >= 30 ? "text-emerald-400" : data.margin >= 15 ? "text-amber-400" : "text-red-400"}`}>{data.margin.toFixed(1)}%</span></p>
      </div>

      {data.outstanding > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 mb-4 flex items-center gap-3">
          <DollarSign className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-400">{formatCurrency(data.outstanding)} outstanding</p>
            <p className="text-[10px] text-muted-foreground">{data.unpaidCount} unpaid invoices this period</p>
          </div>
        </div>
      )}

      {/* Payment Method Chart */}
      <div className="rounded-xl border border-border bg-card p-4 mb-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-3 flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Payment Methods</p>
        {data.paymentChart.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No paid invoices this period.</p>
        ) : (
          <>
            <div className="h-40 mb-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.paymentChart} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {data.paymentChart.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {data.paymentChart.map((p) => (
                <div key={p.method} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                  <span className="text-muted-foreground flex-1">{p.label}</span>
                  <span className="font-medium">{p.count}</span>
                  <span className="text-muted-foreground">{formatCurrency(p.total)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Expense Breakdown */}
      {Object.keys(data.byCategory).length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5"><Receipt className="w-3.5 h-3.5" /> Expense Breakdown</p>
          <div className="space-y-1.5">
            {Object.entries(data.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => {
              const pct = data.totalExpenses > 0 ? (amount / data.totalExpenses) * 100 : 0;
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="text-muted-foreground">{CATEGORY_LABELS[cat] || cat}</span>
                    <span className="font-medium">{formatCurrency(amount)} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}