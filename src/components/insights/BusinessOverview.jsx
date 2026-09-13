import { useEntityCollection } from "@/hooks/useEntityCollection";
import { formatCurrency, formatDate, isOverdue } from "@/lib/lawnCare";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Calendar, AlertTriangle, ClipboardList } from "lucide-react";

export default function BusinessOverview() {
  const { data: jobs = [] } = useEntityCollection("Job", { sort: "-scheduled_date" });
  const { data: invoices = [] } = useEntityCollection("Invoice");

  // --- Weekly revenue, last 8 weeks ---
  function getWeekStart(d) {
    const x = new Date(d);
    const day = x.getDay();
    x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
    x.setHours(0, 0, 0, 0);
    return x;
  }
  const currentWeekStart = getWeekStart(new Date());
  const weeks = [];
  for (let i = 7; i >= 0; i--) {
    const ws = new Date(currentWeekStart);
    ws.setDate(ws.getDate() - i * 7);
    weeks.push({ key: ws.toISOString(), label: ws.toLocaleDateString("en-US", { month: "short", day: "numeric" }), revenue: 0 });
  }
  const weekMap = new Map(weeks.map((w) => [w.key, w]));
  invoices
    .filter((inv) => inv.status === "paid")
    .forEach((inv) => {
      const w = weekMap.get(getWeekStart(new Date(inv.paid_date || inv.created_date)).toISOString());
      if (w) w.revenue += inv.amount || 0;
    });
  const chartData = weeks.map((w) => ({ name: w.label, revenue: w.revenue }));
  const thisWeekRevenue = weeks[weeks.length - 1].revenue;

  // --- Upcoming jobs, next 7 days ---
  const todayStr = new Date().toISOString().slice(0, 10);
  const in7 = new Date();
  in7.setDate(in7.getDate() + 7);
  const in7Str = in7.toISOString().slice(0, 10);
  const upcomingAll = jobs.filter(
    (j) =>
      ["scheduled", "in_progress"].includes(j.status) &&
      (j.scheduled_date || "") >= todayStr &&
      (j.scheduled_date || "") <= in7Str
  );
  const upcomingValue = upcomingAll.reduce((s, j) => s + (j.price || 0), 0);

  // --- Overdue payments ---
  const overdueAll = invoices.filter(isOverdue);
  const overdueTotal = overdueAll.reduce((s, i) => s + (i.amount || 0), 0);
  const dayMs = 86400000;
  const daysOverdue = (inv) =>
    Math.max(0, Math.round((new Date(todayStr) - new Date(String(inv.due_date).slice(0, 10) + "T00:00:00")) / dayMs));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Weekly Revenue
          </h3>
        </div>
        <p className="text-xl font-bold mb-1">{formatCurrency(thisWeekRevenue)}</p>
        <p className="text-[10px] text-muted-foreground mb-2">this week</p>
        <ResponsiveContainer width="100%" height={110}>
          <BarChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval={1} />
            <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
            <Bar dataKey="revenue" fill="#10b981" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Upcoming Jobs
          </h3>
          <span className="text-[10px] text-muted-foreground">next 7 days</span>
        </div>
        <p className="text-xl font-bold mb-1">
          {upcomingAll.length} <span className="text-sm font-medium text-muted-foreground">· {formatCurrency(upcomingValue)}</span>
        </p>
        <div className="mt-2 space-y-1.5">
          {upcomingAll.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Nothing scheduled this week yet.</p>
          ) : (
            upcomingAll
              .sort((a, b) => (a.scheduled_date || "").localeCompare(b.scheduled_date || ""))
              .slice(0, 4)
              .map((j) => (
                <div key={j.id} className="flex items-center gap-2 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  <span className="font-medium truncate">{j.customer_name}</span>
                  <span className="text-muted-foreground ml-auto shrink-0">{formatDate(j.scheduled_date)}</span>
                </div>
              ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <AlertTriangle className={`w-4 h-4 ${overdueAll.length > 0 ? "text-amber-400" : "text-muted-foreground"}`} /> Overdue Payments
          </h3>
        </div>
        <p className={`text-xl font-bold mb-1 ${overdueAll.length > 0 ? "text-amber-400" : ""}`}>{formatCurrency(overdueTotal)}</p>
        <p className="text-[10px] text-muted-foreground mb-2">{overdueAll.length} invoice{overdueAll.length === 1 ? "" : "s"} past due</p>
        <div className="mt-2 space-y-1.5">
          {overdueAll.length === 0 ? (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 py-2">
              <ClipboardList className="w-3.5 h-3.5 text-primary" /> All paid up — nice work.
            </p>
          ) : (
            overdueAll
              .sort((a, b) => daysOverdue(b) - daysOverdue(a))
              .slice(0, 4)
              .map((inv) => (
                <div key={inv.id} className="flex items-center gap-2 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span className="font-medium truncate">{inv.customer_name}</span>
                  <span className="ml-auto shrink-0 font-semibold">{formatCurrency(inv.amount)}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0 w-14 text-right">{daysOverdue(inv)}d late</span>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}