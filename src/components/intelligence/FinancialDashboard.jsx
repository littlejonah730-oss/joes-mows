import { useEntityCollection } from "@/hooks/useEntityCollection";
import ChartCard from "./ChartCard";
import { formatCurrency } from "@/lib/lawnCare";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { DollarSign, TrendingUp, PieChart as PieIcon, Activity, BarChart3 } from "lucide-react";

export default function FinancialDashboard() {
  const { data: jobs = [] } = useEntityCollection("Job");
  const { data: invoices = [] } = useEntityCollection("Invoice");
  const { data: expenses = [] } = useEntityCollection("Expense");

  const now = new Date();

  // Revenue by job type
  const jobTypeRevenue = {};
  jobs.filter((j) => j.status === "completed").forEach((j) => {
    const t = j.job_type || "Mow";
    jobTypeRevenue[t] = (jobTypeRevenue[t] || 0) + (j.price || 0);
  });
  const revByType = Object.entries(jobTypeRevenue)
    .map(([type, revenue]) => ({ type, revenue: Math.round(revenue) }))
    .sort((a, b) => b.revenue - a.revenue);

  // Monthly data (6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - 5 + i + 1, 0);
    const monthInvoices = invoices.filter((inv) => {
      const d = new Date(inv.paid_date || inv.created_date);
      return d >= monthStart && d <= monthEnd && inv.status === "paid";
    });
    const revenue = monthInvoices.reduce((s, inv) => s + (inv.amount || 0), 0);
    const monthExpenses = expenses
      .filter((e) => {
        const d = new Date(e.date);
        return d >= monthStart && d <= monthEnd;
      })
      .reduce((s, e) => s + (e.amount || 0), 0);
    return {
      month: monthStart.toLocaleDateString("en-US", { month: "short" }),
      revenue: Math.round(revenue),
      expenses: Math.round(monthExpenses),
      net: Math.round(revenue - monthExpenses),
    };
  });

  // Cash flow
  const cashFlow = monthlyData.map((m) => ({
    month: m.month,
    inflow: m.revenue,
    outflow: m.expenses,
    net: m.net,
  }));

  // Seasonality (jobs by month this year)
  const seasonality = Array.from({ length: 12 }, (_, i) => {
    const monthStart = new Date(now.getFullYear(), i, 1);
    const monthEnd = new Date(now.getFullYear(), i + 1, 0);
    const count = jobs.filter((j) => {
      const d = new Date(j.scheduled_date);
      return d >= monthStart && d <= monthEnd;
    }).length;
    return { month: monthStart.toLocaleDateString("en-US", { month: "short" }), jobs: count };
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Revenue by Job Type" subtitle="Total per service" icon={DollarSign} delay={0}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revByType}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="type" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip formatter={formatCurrency} />
              <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} animationDuration={1500} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Monthly Revenue" subtitle="6-month trend" icon={TrendingUp} delay={0.1}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip formatter={formatCurrency} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2} fill="url(#revGrad)" animationDuration={1500} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Profit Margin" subtitle="Revenue vs Expenses" icon={PieIcon} delay={0.2}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip formatter={formatCurrency} />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} animationDuration={1500} />
              <Bar dataKey="expenses" name="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} animationDuration={1500} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Cash Flow" subtitle="Revenue vs Expenses" icon={Activity} delay={0.3}>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={cashFlow}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip formatter={formatCurrency} />
              <Legend />
              <Bar dataKey="inflow" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} animationDuration={1500} />
              <Bar dataKey="outflow" name="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} animationDuration={1500} />
              <Line type="monotone" dataKey="net" name="Net" stroke="#38bdf8" strokeWidth={2} animationDuration={1500} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <ChartCard title="Seasonality" subtitle="Jobs by month" icon={BarChart3} delay={0.4}>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={seasonality}>
            <defs>
              <linearGradient id="seasonGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip />
            <Area type="monotone" dataKey="jobs" name="Jobs" stroke="#38bdf8" strokeWidth={2} fill="url(#seasonGrad)" animationDuration={1500} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}