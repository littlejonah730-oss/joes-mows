import { useEntityCollection } from "@/hooks/useEntityCollection";
import ChartCard from "./ChartCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Clock, Layers } from "lucide-react";

export default function OperationsMetrics() {
  const { data: jobs = [] } = useEntityCollection("Job");

  // Duration histogram
  const timed = jobs.filter((j) => j.timer_duration_seconds > 0);
  const bins = [
    { range: "0-15m", min: 0, max: 15, count: 0 },
    { range: "15-30m", min: 15, max: 30, count: 0 },
    { range: "30-45m", min: 30, max: 45, count: 0 },
    { range: "45-60m", min: 45, max: 60, count: 0 },
    { range: "60-90m", min: 60, max: 90, count: 0 },
    { range: "90m+", min: 90, max: Infinity, count: 0 },
  ];
  timed.forEach((j) => {
    const mins = j.timer_duration_seconds / 60;
    const bin = bins.find((b) => mins >= b.min && mins < b.max);
    if (bin) bin.count++;
  });

  // Job frequency by service type
  const jobTypes = {};
  jobs.forEach((j) => {
    const t = j.job_type || "Mow";
    jobTypes[t] = (jobTypes[t] || 0) + 1;
  });
  const freqData = Object.entries(jobTypes)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartCard title="Average Job Duration" subtitle="Distribution" icon={Clock} delay={0}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={bins}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="range" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip />
            <Bar dataKey="count" name="Jobs" fill="#10b981" radius={[4, 4, 0, 0]} animationDuration={1500} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Job Frequency by Service" subtitle="Service type breakdown" icon={Layers} delay={0.1}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={freqData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis dataKey="type" type="category" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={80} />
            <Tooltip />
            <Bar dataKey="count" name="Jobs" fill="#38bdf8" radius={[0, 4, 4, 0]} animationDuration={1500} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}