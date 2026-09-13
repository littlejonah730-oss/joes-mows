import { useEntityCollection } from "@/hooks/useEntityCollection";
import ChartCard from "./ChartCard";
import { formatCurrency } from "@/lib/lawnCare";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Users, Zap, Clock } from "lucide-react";

const ROLE_PAY = { greenhorn: 15, groundsman: 18, operator: 20, foreman: 25, specialist: 22 };

export default function EmployeeAnalytics() {
  const { data: employees = [] } = useEntityCollection("Employee");
  const { data: jobs = [] } = useEntityCollection("Job");

  const completedJobs = jobs.filter((j) => j.status === "completed");

  // Jobs per employee (from the manually-tracked yards_completed count)
  const jobsPerEmp = employees
    .map((emp) => ({ name: emp.name.split(" ")[0], jobs: emp.yards_completed ?? 0 }))
    .sort((a, b) => b.jobs - a.jobs);

  // Efficiency ratio
  const efficiency = employees
    .map((emp) => {
      const empJobs = completedJobs.filter((j) => j.claimed_by_employee_id === emp.id);
      const revenue = empJobs.reduce((s, j) => s + (j.price || 0), 0);
      const laborCost = (emp.yards_completed || 0) * (ROLE_PAY[emp.role] || 18) * 0.5;
      return { name: emp.name.split(" ")[0], revenue: Math.round(revenue), laborCost: Math.round(laborCost) };
    })
    .sort((a, b) => b.revenue - a.revenue);

  // Job completion speed
  const timedJobs = completedJobs.filter((j) => j.timer_duration_seconds > 0);
  const companyAvg = timedJobs.length > 0 ? timedJobs.reduce((s, j) => s + j.timer_duration_seconds, 0) / timedJobs.length / 60 : 0;
  const speedData = employees
    .map((emp) => {
      const empTimed = timedJobs.filter((j) => j.claimed_by_employee_id === emp.id);
      const avg = empTimed.length > 0 ? empTimed.reduce((s, j) => s + j.timer_duration_seconds, 0) / empTimed.length / 60 : 0;
      return { name: emp.name.split(" ")[0], minutes: Math.round(avg), companyAvg: Math.round(companyAvg) };
    })
    .sort((a, b) => b.minutes - a.minutes);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Jobs per Employee" subtitle="Total completed" icon={Users} delay={0}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={jobsPerEmp}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" interval={0} angle={-25} textAnchor="end" height={45} tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip />
              <Bar dataKey="jobs" name="Total Jobs" fill="#10b981" radius={[4, 4, 0, 0]} animationDuration={1500} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Efficiency Ratio" subtitle="Revenue vs Labor Cost" icon={Zap} delay={0.1}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={efficiency}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" interval={0} angle={-25} textAnchor="end" height={45} tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip formatter={formatCurrency} />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} animationDuration={1500} />
              <Bar dataKey="laborCost" name="Labor Cost" fill="#f87171" radius={[4, 4, 0, 0]} animationDuration={1500} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <ChartCard title="Job Completion Speed" subtitle="Avg minutes vs company avg" icon={Clock} delay={0.2}>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={speedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" interval={0} angle={-25} textAnchor="end" height={45} tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="minutes" name="Employee" stroke="#38bdf8" strokeWidth={2} dot={{ r: 4 }} animationDuration={1500} />
            <Line type="monotone" dataKey="companyAvg" name="Company Avg" stroke="#fbbf24" strokeDasharray="5 5" strokeWidth={2} dot={false} animationDuration={1500} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}