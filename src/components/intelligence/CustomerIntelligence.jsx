import { useEntityCollection } from "@/hooks/useEntityCollection";
import ChartCard from "./ChartCard";
import { formatCurrency } from "@/lib/lawnCare";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Users, TrendingUp, DollarSign } from "lucide-react";

const CHART_COLORS = ["#10b981", "#38bdf8", "#fbbf24", "#a78bfa", "#f87171", "#fb923c"];

export default function CustomerIntelligence() {
  const { data: customers = [] } = useEntityCollection("Customer");
  const { data: jobs = [] } = useEntityCollection("Job");

  const now = new Date();

  // Customer growth by quarter (last 4 quarters)
  const quarters = [];
  for (let q = 3; q >= 0; q--) {
    const qStart = new Date(now.getFullYear(), now.getMonth() - q * 3 - 2, 1);
    const qEnd = new Date(now.getFullYear(), now.getMonth() - q * 3 + 1, 0);
    const newClients = customers.filter((c) => {
      const d = new Date(c.created_date);
      return d >= qStart && d <= qEnd;
    }).length;
    const lostClients = customers.filter((c) => {
      if (c.active) return false;
      const custJobs = jobs.filter((j) => j.customer_id === c.id && j.status === "completed");
      const last = custJobs.sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date))[0];
      if (!last) return false;
      const d = new Date(last.scheduled_date);
      return d >= qStart && d <= qEnd;
    }).length;
    quarters.push({
      quarter: `Q${Math.floor(qStart.getMonth() / 3) + 1}`,
      new: newClients,
      lost: lostClients,
    });
  }

  // Average spend distribution
  const customerSpend = customers.map((c) => {
    const custJobs = jobs.filter((j) => j.customer_id === c.id && j.status === "completed");
    return custJobs.reduce((s, j) => s + (j.price || 0), 0);
  });
  const spendData = [
    { name: "Low (<$100)", value: customerSpend.filter((s) => s > 0 && s < 100).length, color: CHART_COLORS[2] },
    { name: "Medium ($100-$500)", value: customerSpend.filter((s) => s >= 100 && s < 500).length, color: CHART_COLORS[0] },
    { name: "High ($500+)", value: customerSpend.filter((s) => s >= 500).length, color: CHART_COLORS[1] },
  ];

  // CLV by service type
  const jobTypes = [...new Set(jobs.map((j) => j.job_type || "Mow"))];
  const clvData = jobTypes
    .map((jt) => {
      const typeJobs = jobs.filter((j) => (j.job_type || "Mow") === jt);
      const customerIds = [...new Set(typeJobs.map((j) => j.customer_id))];
      const totalRev = typeJobs.reduce((s, j) => s + (j.price || 0), 0);
      return { service: jt, clv: customerIds.length > 0 ? Math.round(totalRev / customerIds.length) : 0 };
    })
    .sort((a, b) => b.clv - a.clv);

  // Customer revenue breakdown (total & monthly average)
  const customerRevenue = customers
    .map((c) => {
      const custJobs = jobs.filter((j) => j.customer_id === c.id && j.status === "completed");
      const total = custJobs.reduce((s, j) => s + (j.price || 0), 0);
      const sortedByDate = [...custJobs].sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
      const firstJob = sortedByDate[0];
      let monthsActive = 1;
      if (firstJob) {
        const monthsDiff = Math.max(1, Math.round((now - new Date(firstJob.scheduled_date)) / (1000 * 60 * 60 * 24 * 30)));
        monthsActive = monthsDiff;
      }
      const monthlyAvg = total / monthsActive;
      return { name: c.name.split(" ")[0], total: Math.round(total), monthlyAvg: Math.round(monthlyAvg) };
    })
    .filter((d) => d.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return (
    <div className="space-y-4">
      <ChartCard title="Customer Growth" subtitle="New vs Lost per Quarter" icon={TrendingUp} delay={0}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={quarters}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="quarter" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip />
            <Legend />
            <Bar dataKey="new" name="New" fill="#10b981" radius={[4, 4, 0, 0]} animationDuration={1500} />
            <Bar dataKey="lost" name="Lost" fill="#f87171" radius={[4, 4, 0, 0]} animationDuration={1500} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Average Spend Distribution" subtitle="By customer tier" icon={Users} delay={0.2}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={spendData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {spendData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Lifetime Value (CLV)" subtitle="By service type" icon={DollarSign} delay={0.3}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={clvData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis dataKey="service" type="category" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={80} />
              <Tooltip formatter={formatCurrency} />
              <Bar dataKey="clv" name="CLV" fill="#38bdf8" radius={[0, 4, 4, 0]} animationDuration={1500} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <ChartCard title="Customer Revenue" subtitle="Total & monthly average (top 10)" icon={DollarSign} delay={0.4}>
        <ResponsiveContainer width="100%" height={Math.max(220, customerRevenue.length * 32)}>
          <BarChart data={customerRevenue} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={70} />
            <Tooltip formatter={formatCurrency} />
            <Legend />
            <Bar dataKey="total" name="Total Revenue" fill="#10b981" radius={[0, 4, 4, 0]} animationDuration={1500} />
            <Bar dataKey="monthlyAvg" name="Monthly Avg" fill="#38bdf8" radius={[0, 4, 4, 0]} animationDuration={1500} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}