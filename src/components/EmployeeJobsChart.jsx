import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { BarChart3 } from "lucide-react";

export default function EmployeeJobsChart({ employees, jobs }) {
  const data = employees
    .filter((e) => e.active !== false)
    .map((emp) => ({
      name: emp.name?.split(" ")[0] || "—",
      jobs: emp.yards_completed ?? 0,
    }))
    .sort((a, b) => b.jobs - a.jobs);

  const hasData = data.some((d) => d.jobs > 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 mb-6">
      <h2 className="font-semibold mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> Jobs Completed per Employee</h2>
      {hasData ? (
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", fontSize: "12px" }} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
              <Bar dataKey="jobs" name="Completed Jobs" fill="#10b981" radius={[4, 4, 0, 0]} animationDuration={1200} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-8">No completed jobs claimed by employees yet.</p>
      )}
    </div>
  );
}