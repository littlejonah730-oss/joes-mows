import { useEntityCollection } from "@/hooks/useEntityCollection";
import ChartCard from "./ChartCard";
import { StatCard } from "@/components/ui/shared";
import { formatCurrency } from "@/lib/lawnCare";
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import { DollarSign, Wallet, Target, TrendingUp } from "lucide-react";

export default function AdvancedInsights() {
  const { data: invoices = [] } = useEntityCollection("Invoice");
  const { data: expenses = [] } = useEntityCollection("Expense");
  const { data: equipment = [] } = useEntityCollection("Equipment");

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Mowing season: March (2) through mid-November (10, day 15)
  const seasonMonths = [
    { idx: 2, name: "Mar" }, { idx: 3, name: "Apr" }, { idx: 4, name: "May" },
    { idx: 5, name: "Jun" }, { idx: 6, name: "Jul" }, { idx: 7, name: "Aug" },
    { idx: 8, name: "Sep" }, { idx: 9, name: "Oct" }, { idx: 10, name: "Nov" },
  ];

  const seasonData = seasonMonths.map(({ idx, name }) => {
    const monthStart = new Date(currentYear, idx, 1);
    const monthEnd = idx === 10 ? new Date(currentYear, idx, 15) : new Date(currentYear, idx + 1, 0);
    const hasActual = idx <= currentMonth;
    const actualRevenue = invoices
      .filter((inv) => {
        const d = new Date(inv.paid_date || inv.created_date);
        return d >= monthStart && d <= monthEnd && inv.status === "paid";
      })
      .reduce((s, inv) => s + (inv.amount || 0), 0);
    return {
      month: name,
      actual: hasActual ? Math.round(actualRevenue) : null,
      projected: null,
    };
  });

  // Project future months based on average of months with revenue
  const monthsWithRevenue = seasonData.filter((d) => d.actual !== null && d.actual > 0);
  const avgMonthly = monthsWithRevenue.length > 0
    ? monthsWithRevenue.reduce((s, d) => s + d.actual, 0) / monthsWithRevenue.length
    : 0;

  seasonData.forEach((d) => {
    if (d.actual === null) {
      d.projected = Math.round(avgMonthly);
    }
  });

  const totalSeasonRevenue = seasonData.reduce((s, d) => s + (d.actual || d.projected || 0), 0);

  // Business Net Worth = (Equipment Value + Cash + Money Owed) - (Debts + Unpaid Bills)
  const equipmentValue = equipment.reduce((s, e) => s + (e.purchase_price || 0), 0);
  const cash = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + (i.amount || 0), 0)
    - expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const moneyOwed = invoices.filter((i) => i.status === "unpaid").reduce((s, i) => s + (i.amount || 0), 0);
  const netWorth = equipmentValue + cash + moneyOwed;

  // Expected next year based on growth pattern from this year vs last year
  const lastYearRevenue = invoices.filter((inv) => {
    const d = new Date(inv.paid_date || inv.created_date);
    return d.getFullYear() === currentYear - 1 && d.getMonth() >= 2 && d.getMonth() <= 10 && inv.status === "paid";
  }).reduce((s, inv) => s + (inv.amount || 0), 0);

  let growthRate = 0.1;
  if (lastYearRevenue > 0) {
    growthRate = (totalSeasonRevenue - lastYearRevenue) / lastYearRevenue;
  }
  const expectedNextYear = Math.round(totalSeasonRevenue * (1 + Math.max(growthRate, 0.05)));

  // Break-even analysis (6 months)
  const breakEvenData = Array.from({ length: 6 }, (_, i) => {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - 5 + i + 1, 0);
    const rev = invoices.filter((inv) => {
      const d = new Date(inv.paid_date || inv.created_date);
      return d >= monthStart && d <= monthEnd && inv.status === "paid";
    }).reduce((s, inv) => s + (inv.amount || 0), 0);
    const cost = expenses.filter((e) => {
      const d = new Date(e.date);
      return d >= monthStart && d <= monthEnd;
    }).reduce((s, e) => s + (e.amount || 0), 0);
    return {
      month: monthStart.toLocaleDateString("en-US", { month: "short" }),
      revenue: Math.round(rev),
      costs: Math.round(cost),
    };
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={DollarSign} label="Season Revenue (Projected)" value={formatCurrency(totalSeasonRevenue)} sublabel="March → Mid-November" />
        <StatCard icon={Wallet} label="Business Net Worth" value={formatCurrency(netWorth)} sublabel={`Equip ${formatCurrency(equipmentValue)} + Cash ${formatCurrency(cash)} + Owed ${formatCurrency(moneyOwed)}`} accent="bg-blue-500/10" />
        <StatCard icon={Target} label="Expected Next Year" value={formatCurrency(expectedNextYear)} sublabel={`Based on ${Math.round(Math.max(growthRate, 0.05) * 100)}% growth`} accent="bg-amber-500/10" />
      </div>

      <ChartCard title="Seasonal Revenue Projection" subtitle="Mowing season: March → Mid-November" icon={TrendingUp} delay={0.1}>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={seasonData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip formatter={formatCurrency} />
            <Legend />
            <Bar dataKey="actual" name="Actual" fill="#10b981" radius={[4, 4, 0, 0]} animationDuration={1500} />
            <Bar dataKey="projected" name="Projected" fill="#38bdf8" fillOpacity={0.5} radius={[4, 4, 0, 0]} animationDuration={1500} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Break-Even Analysis" subtitle="Revenue vs Costs (6 months)" icon={Target} delay={0.2}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={breakEvenData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip formatter={formatCurrency} />
            <Legend />
            <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} animationDuration={1500} />
            <Bar dataKey="costs" name="Costs" fill="#f87171" radius={[4, 4, 0, 0]} animationDuration={1500} />
            <ReferenceLine y={0} stroke="#666" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}