import { useMemo } from "react";
import { useEntityCollection } from "@/hooks/useEntityCollection";
import { PageHeader, LoadingState, StatCard } from "@/components/ui/shared";
import { formatCurrency, getJobCrewSeconds } from "@/lib/lawnCare";
import {
  TrendingUp, TrendingDown, Wallet, BarChart3, ArrowUpRight, ArrowDownRight,
  Route, Gauge, ClipboardList, Wrench, Users, UserCog, DollarSign, Settings, Sparkles, Activity
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import RevealOnScroll from "@/components/RevealOnScroll";
import NetWorthCard from "@/components/NetWorthCard";
import CustomerIntelligence from "@/components/intelligence/CustomerIntelligence";
import EmployeeAnalytics from "@/components/intelligence/EmployeeAnalytics";
import FinancialDashboard from "@/components/intelligence/FinancialDashboard";
import OperationsMetrics from "@/components/intelligence/OperationsMetrics";
import AdvancedInsights from "@/components/intelligence/AdvancedInsights";
import YearlyGrowth from "@/components/intelligence/YearlyGrowth";
import BusinessGrowth from "@/components/intelligence/BusinessGrowth";
import { HISTORICAL_REVENUE } from "@/lib/historical";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const INTEL_SECTIONS = [
  { id: "customers", title: "Customer Intelligence", icon: Users, component: CustomerIntelligence, insight: "Retention above 90% = loyal customer base" },
  { id: "employees", title: "Employee Analytics", icon: UserCog, component: EmployeeAnalytics, insight: "Efficiency ratio above 2.0 = strong productivity" },
  { id: "financial", title: "Financial Dashboard", icon: DollarSign, component: FinancialDashboard, insight: "Track cash flow & seasonality trends" },
  { id: "operations", title: "Operations Metrics", icon: Settings, component: OperationsMetrics, insight: "Monitor job duration & service mix" },
  { id: "advanced", title: "Advanced Insights", icon: Sparkles, component: AdvancedInsights, insight: "Seasonal projection & break-even for growth planning" },
];

function getMonthKey(dateStr) {
  if (!dateStr) return null;
  const date = typeof dateStr === "string" && dateStr.length === 10 ? new Date(dateStr + "T00:00:00") : new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth()).padStart(2, "0")}`;
}

function monthLabel(key) {
  const [y, m] = key.split("-");
  return `${MONTH_NAMES[Number(m)]} ${y}`;
}

export default function Reports() {
  const { data: invoices = [], isLoading: invLoading } = useEntityCollection("Invoice");
  const { data: expenses = [], isLoading: expLoading } = useEntityCollection("Expense");
  const { data: mileage = [], isLoading: mileageLoading } = useEntityCollection("Mileage", { sort: "-date" });
  const { data: allJobs = [] } = useEntityCollection("Job");
  const { data: customers = [] } = useEntityCollection("Customer");

  const monthlyData = useMemo(() => {
    const map = {};

    invoices.forEach((inv) => {
      const dateField = inv.paid_date || inv.due_date;
      const key = getMonthKey(dateField);
      if (!key) return;
      if (!map[key]) map[key] = { revenue: 0, expenses: 0, jobs: 0 };
      if (inv.status === "paid") map[key].revenue += inv.amount || 0;
    });

    expenses.forEach((exp) => {
      const key = getMonthKey(exp.date);
      if (!key) return;
      if (!map[key]) map[key] = { revenue: 0, expenses: 0, jobs: 0 };
      map[key].expenses += exp.amount || 0;
    });

    return Object.keys(map)
      .sort()
      .map((key) => ({
        key,
        label: monthLabel(key),
        revenue: Math.round(map[key].revenue),
        expenses: Math.round(map[key].expenses),
        profit: Math.round(map[key].revenue - map[key].expenses),
      }));
  }, [invoices, expenses]);

  const totals = useMemo(() => {
    const monthlyRevenue = monthlyData.reduce((s, m) => s + m.revenue, 0);
    const expenses = monthlyData.reduce((s, m) => s + m.expenses, 0);
    const revenue = monthlyRevenue + HISTORICAL_REVENUE;
    const profit = revenue - expenses;
    const prevMonth = monthlyData[monthlyData.length - 2];
    const currMonth = monthlyData[monthlyData.length - 1];
    const revenueChange = prevMonth && currMonth ? ((currMonth.revenue - prevMonth.revenue) / (prevMonth.revenue || 1)) * 100 : 0;
    const totalWeeks = monthlyData.length * 4.33;
    const weeklyRevenue = totalWeeks > 0 ? monthlyRevenue / totalWeeks : 0;
    const weeklyExpenses = totalWeeks > 0 ? expenses / totalWeeks : 0;
    const weeklyProfit = weeklyRevenue - weeklyExpenses;
    return { revenue, expenses, profit, revenueChange, weeklyRevenue, weeklyExpenses, weeklyProfit };
  }, [monthlyData]);

  const annualNetProfit = useMemo(() => monthlyData.slice(-12).reduce((s, m) => s + m.profit, 0), [monthlyData]);

  const mileageStats = useMemo(() => {
    const totalMiles = mileage.reduce((s, m) => s + (m.miles || 0), 0);
    const uniqueDates = [...new Set(mileage.map((m) => m.date))];
    const dayCount = uniqueDates.length;

    let weeklyAvg = 0;
    let dailyAvg = 0;
    if (mileage.length > 0) {
      const dates = mileage.map((m) => new Date(m.date + (m.date?.length === 10 ? "T00:00:00" : ""))).sort((a, b) => a - b);
      const earliest = dates[0];
      const latest = new Date();
      const spanDays = Math.max(1, Math.round((latest - earliest) / (1000 * 60 * 60 * 24)));
      weeklyAvg = totalMiles / (spanDays / 7);
      dailyAvg = totalMiles / spanDays;
    }

    const now = new Date();
    const monthMiles = mileage.filter((m) => {
      const d = new Date(m.date + (m.date?.length === 10 ? "T00:00:00" : ""));
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((s, m) => s + (m.miles || 0), 0);

    const recentDays = uniqueDates.sort().slice(-7);
    const dailyBreakdown = recentDays.map((d) => ({
      date: d,
      miles: mileage.filter((m) => m.date === d).reduce((s, m) => s + (m.miles || 0), 0),
    }));

    return { totalMiles, weeklyAvg, dailyAvg, monthMiles, dayCount, dailyBreakdown };
  }, [mileage]);

  if (invLoading || expLoading || mileageLoading) return <LoadingState />;

  // Work hrs/week based ONLY on weeks that actually have tracked timer time.
  function weekStartKey(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday start
    date.setDate(date.getDate() + diff);
    date.setHours(0, 0, 0, 0);
    return date.toISOString().slice(0, 10);
  }
  const timedWeeks = new Set();
  const totalTrackedHours = allJobs.reduce((sum, j) => {
    if (!j.timer_duration_seconds || j.status !== "completed") return sum;
    const d = j.scheduled_date ? new Date(j.scheduled_date.length === 10 ? j.scheduled_date + "T00:00:00" : j.scheduled_date) : null;
    if (d) timedWeeks.add(weekStartKey(d));
    return sum + getJobCrewSeconds(j) / 3600;
  }, 0);
  const weeksTracked = timedWeeks.size;
  const avgWorkHrsPerWeek = weeksTracked > 0 ? totalTrackedHours / weeksTracked : 0;

  const chartData = monthlyData;
  const hasData = chartData.length > 0;

  return (
    <div>
      <PageHeader title="Reports" subtitle="Financials & business intelligence" />

      <div className="rounded-xl border border-border bg-card p-3 mb-4 flex items-center gap-3">
        <ClipboardList className="w-5 h-5 text-primary shrink-0" />
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Jobs</p>
          <p className="text-lg font-bold">{allJobs.filter((j) => j.status === "completed").length}<span className="text-muted-foreground">/{allJobs.filter((j) => j.status === "scheduled" || j.status === "in_progress").length}</span> <span className="text-xs text-muted-foreground font-normal">completed/scheduled</span></p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard icon={Wallet} label="Total Revenue" value={formatCurrency(totals.revenue)} sublabel="(since 2025)" accent="bg-emerald-500/10" />
        <StatCard icon={TrendingDown} label="Total Expenses" value={formatCurrency(totals.expenses)} accent="bg-red-500/10" />
        <StatCard
          icon={totals.profit >= 0 ? TrendingUp : TrendingDown}
          label="Net Profit"
          value={formatCurrency(totals.profit)}
          accent={totals.profit >= 0 ? "bg-primary/10" : "bg-red-500/10"}
        />
        <StatCard
          icon={BarChart3}
          label="Revenue Change"
          value={`${totals.revenueChange >= 0 ? "+" : ""}${totals.revenueChange.toFixed(1)}%`}
          sublabel="vs last month"
          accent={totals.revenueChange >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}
        />
        <StatCard icon={Wrench} label="Work Hrs/Week" value={`${avgWorkHrsPerWeek.toFixed(1)}h`} sublabel={`${weeksTracked} timed wk${weeksTracked !== 1 ? "s" : ""}`} accent="bg-blue-500/10" />
      </div>

      <NetWorthCard invoices={invoices} expenses={expenses} annualNetProfit={annualNetProfit} />

      <div className="rounded-2xl border border-border bg-card p-4 mb-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Route className="w-4 h-4 text-primary" />
          Mileage
        </h2>
        {mileageStats.totalMiles > 0 ? (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">All Time</p>
                <p className="text-lg font-bold text-blue-400">{mileageStats.totalMiles.toLocaleString(undefined, { maximumFractionDigits: 1 })}</p>
                <p className="text-[10px] text-muted-foreground">miles</p>
              </div>
              <div className="text-center border-x border-border">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Weekly Avg</p>
                <p className="text-lg font-bold text-primary">{mileageStats.weeklyAvg.toLocaleString(undefined, { maximumFractionDigits: 1 })}</p>
                <p className="text-[10px] text-muted-foreground">miles / wk</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Daily Avg</p>
                <p className="text-lg font-bold text-primary">{mileageStats.dailyAvg.toLocaleString(undefined, { maximumFractionDigits: 1 })}</p>
                <p className="text-[10px] text-muted-foreground">miles / day</p>
              </div>
            </div>
            <div className="space-y-1 pt-2 border-t border-border">
              <div className="flex items-center justify-between px-1 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                <span>Last {mileageStats.dailyBreakdown.length} Driving Days</span>
                <span>Miles</span>
              </div>
              {mileageStats.dailyBreakdown.map((d) => (
                <div key={d.date} className="flex items-center justify-between px-1 py-1.5 rounded-lg hover:bg-muted/40">
                  <span className="text-xs font-medium">{d.date}</span>
                  <span className="text-xs font-bold text-blue-400">{d.miles.toLocaleString(undefined, { maximumFractionDigits: 1 })} mi</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 py-2">
            <Gauge className="w-5 h-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No mileage logged yet. Add miles from the Expenses page.</p>
          </div>
        )}
      </div>

      {hasData ? (
        <>
          <div className="rounded-2xl border border-border bg-card p-4 mb-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Weekly Averages
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Revenue</p>
                <p className="text-lg font-bold text-emerald-400">{formatCurrency(totals.weeklyRevenue)}</p>
                <p className="text-[10px] text-muted-foreground">per week</p>
              </div>
              <div className="text-center border-x border-border">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Expenses</p>
                <p className="text-lg font-bold text-red-400">{formatCurrency(totals.weeklyExpenses)}</p>
                <p className="text-[10px] text-muted-foreground">per week</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Net Profit</p>
                <p className={`text-lg font-bold ${totals.weeklyProfit >= 0 ? "text-primary" : "text-red-400"}`}>{formatCurrency(totals.weeklyProfit)}</p>
                <p className="text-[10px] text-muted-foreground">per week</p>
              </div>
            </div>
          </div>

          <RevealOnScroll className="mb-6" placeholderHeight={360}>
            <div className="rounded-2xl border border-border bg-card p-4">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Revenue vs Expenses
              </h2>
              <div className="w-full h-64 lg:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "0.75rem",
                        fontSize: "12px",
                      }}
                      formatter={(v) => formatCurrency(v)}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Line type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="profit" name="Net Profit" stroke="#fbbf24" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </RevealOnScroll>

          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Monthly Breakdown
            </h2>
            <div className="space-y-1">
              <div className="grid grid-cols-4 gap-2 px-2 pb-2 border-b border-border text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                <span>Month</span>
                <span className="text-right">Revenue</span>
                <span className="text-right">Expenses</span>
                <span className="text-right">Profit</span>
              </div>
              {[...monthlyData].reverse().map((m) => {
                const isProfit = m.profit >= 0;
                return (
                  <div key={m.key} className="grid grid-cols-4 gap-2 px-2 py-2.5 rounded-lg hover:bg-muted/50 transition-colors items-center">
                    <span className="text-sm font-medium">{m.label}</span>
                    <span className="text-sm text-right text-emerald-400">{formatCurrency(m.revenue)}</span>
                    <span className="text-sm text-right text-red-400">{formatCurrency(m.expenses)}</span>
                    <span className={`text-sm text-right font-semibold flex items-center justify-end gap-1 ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                      {isProfit ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {formatCurrency(m.profit)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No data yet. Add invoices and expenses to see reports.</p>
        </div>
      )}

      <YearlyGrowth invoices={invoices} expenses={expenses} allJobs={allJobs} customers={customers} />

      <BusinessGrowth invoices={invoices} />

      <div className="flex items-center gap-3 mt-10 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center neon-glow">
          <Activity className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl lg:text-2xl font-bold tracking-tight">Business Intelligence</h2>
          <p className="text-sm text-muted-foreground">Command center — every metric that matters</p>
        </div>
      </div>

      <div className="space-y-6">
        {INTEL_SECTIONS.map((section) => {
          const Component = section.component;
          const Icon = section.icon;
          return (
            <RevealOnScroll key={section.id} placeholderHeight={340}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold">{section.title}</h3>
                </div>
                <span className="text-[10px] text-muted-foreground hidden sm:block">{section.insight}</span>
              </div>
              <Component />
            </RevealOnScroll>
          );
        })}
      </div>
    </div>
  );
}