import { useMemo } from "react";
import { formatCurrency } from "@/lib/lawnCare";
import { HISTORICAL_YEARS, yearOf } from "@/lib/historical";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import RevealOnScroll from "@/components/RevealOnScroll";

export default function BusinessGrowth({ invoices = [] }) {
  const data = useMemo(() => {
    const byYear = {};
    HISTORICAL_YEARS.forEach((h) => {
      byYear[h.year] = (byYear[h.year] || 0) + (h.revenue || 0);
    });
    invoices.forEach((inv) => {
      if (inv.status !== "paid") return;
      const y = yearOf(inv.paid_date || inv.due_date);
      if (y == null) return;
      byYear[y] = (byYear[y] || 0) + (inv.amount || 0);
    });
    let cumulative = 0;
    return Object.keys(byYear)
      .map(Number)
      .sort((a, b) => a - b)
      .map((year) => {
        cumulative += byYear[year];
        return { year, cumulative: Math.round(cumulative) };
      });
  }, [invoices]);

  if (data.length === 0) return null;

  const total = data[data.length - 1].cumulative;
  const first = data[0].cumulative || 1;
  const growthPct = ((total - first) / first) * 100;

  return (
    <RevealOnScroll className="mb-6" placeholderHeight={320}>
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Business Growth</h2>
          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
            {growthPct >= 0 ? "+" : ""}{growthPct.toFixed(0)}% since {data[0].year}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Cumulative all-time revenue — the overall growth of the business.</p>
        <div className="w-full h-64 lg:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" tickFormatter={(v) => `$${v}`} width={56} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", fontSize: "12px" }}
                formatter={(v) => formatCurrency(v)}
              />
              <Area type="monotone" dataKey="cumulative" name="Total Revenue" stroke="hsl(var(--primary))" strokeWidth={3} fill="url(#growthFill)" dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </RevealOnScroll>
  );
}