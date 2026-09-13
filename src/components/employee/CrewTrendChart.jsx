import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import ChartCard from "@/components/intelligence/ChartCard";
import { BarChart3 } from "lucide-react";

const COLORS = ["#10b981", "#38bdf8", "#fbbf24", "#a78bfa", "#f87171", "#fb923c"];

// Stacked monthly output: completed crew yards per employee over the last 6 months.
export default function CrewTrendChart({ data = [], names = [] }) {
  return (
    <ChartCard title="Crew Output by Month" subtitle="Completed crew yards, last 6 months" icon={BarChart3} delay={0.15}>
      {names.length === 0 ? (
        <p className="text-xs text-muted-foreground py-8 text-center">No crew yards completed yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip />
            <Legend />
            {names.map((n, i) => (
              <Bar key={n} dataKey={n} stackId="crew" fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} animationDuration={1500} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}