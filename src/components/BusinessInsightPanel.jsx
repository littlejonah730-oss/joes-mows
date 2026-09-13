import { useEntityCollection } from "@/hooks/useEntityCollection";
import { StatCard } from "@/components/ui/shared";
import { DollarSign, Clock, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";
import { formatCurrency, getJobCrewSeconds } from "@/lib/lawnCare";

export default function BusinessInsightPanel() {
  const { data: jobs = [] } = useEntityCollection("Job");
  const { data: customers = [] } = useEntityCollection("Customer");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const completed = jobs.filter(j => j.status === "completed");
  const completedThisMonth = completed.filter(j => {
    const d = new Date(j.completed_date || j.scheduled_date);
    return d >= monthStart;
  });

  const timed = completed.filter(j => getJobCrewSeconds(j) > 0);
  const totalRevenue = completed.reduce((s, j) => s + (j.price || 0), 0);
  const monthRevenue = completedThisMonth.reduce((s, j) => s + (j.price || 0), 0);
  const timedRevenue = timed.reduce((s, j) => s + (j.price || 0), 0);
  const totalSeconds = timed.reduce((s, j) => s + getJobCrewSeconds(j), 0);
  const avgHourly = totalSeconds > 0 ? timedRevenue / (totalSeconds / 3600) : 0;
  const avgTimePerJob = timed.length > 0 ? totalSeconds / timed.length : 0;

  const customerValues = customers.map(c => {
    const custTimed = timed.filter(j => j.customer_id === c.id);
    if (custTimed.length === 0) return null;
    const rev = custTimed.reduce((s, j) => s + (j.price || 0), 0);
    const secs = custTimed.reduce((s, j) => s + getJobCrewSeconds(j), 0);
    return { customer: c, hourly: rev / (secs / 3600) };
  }).filter(Boolean);

  const sorted = [...customerValues].sort((a, b) => b.hourly - a.hourly);
  const highest = sorted.slice(0, Math.min(3, Math.ceil(sorted.length / 2)));
  const lowest = sorted.length > 3
    ? sorted.slice(-Math.min(3, sorted.length - highest.length)).reverse()
    : [];

  // Difficulty vs value
  const difficultyBuckets = [1, 2, 3, 4, 5].map(level => {
    const levelJobs = timed.filter(j => (j.difficulty || 3) === level);
    if (levelJobs.length === 0) return { level, hourly: 0, count: 0 };
    const rev = levelJobs.reduce((s, j) => s + (j.price || 0), 0);
    const secs = levelJobs.reduce((s, j) => s + getJobCrewSeconds(j), 0);
    return { level, hourly: secs > 0 ? rev / (secs / 3600) : 0, count: levelJobs.length };
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-4 mb-6">
      <h2 className="font-semibold mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        Business Insights
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon={DollarSign} label="Avg $/Hour" value={formatCurrency(avgHourly)} accent="bg-emerald-500/10" />
        <StatCard icon={Clock} label="Avg Time/Job" value={`${Math.floor(avgTimePerJob / 60)}m`} accent="bg-blue-500/10" />
        <StatCard icon={CheckCircle2} label="Jobs This Month" value={completedThisMonth.length} accent="bg-primary/10" />
        <StatCard icon={TrendingUp} label="Revenue This Month" value={formatCurrency(monthRevenue)} accent="bg-emerald-500/10" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-xs font-semibold text-emerald-400 uppercase mb-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Highest-Value Customers</p>
          {highest.length === 0 ? <p className="text-sm text-muted-foreground">No data yet</p> : highest.map(cv => (
            <div key={cv.customer.id} className="flex justify-between items-center py-1.5 px-2 rounded-lg bg-emerald-500/5 mb-1">
              <span className="text-sm truncate">{cv.customer.name}</span>
              <span className="text-sm font-bold text-emerald-400">{formatCurrency(cv.hourly)}/hr</span>
            </div>
          ))}
        </div>
        <div>
          <p className="text-xs font-semibold text-red-400 uppercase mb-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Lowest-Value Customers</p>
          {lowest.length === 0 ? <p className="text-sm text-muted-foreground">No data yet</p> : lowest.map(cv => (
            <div key={cv.customer.id} className="flex justify-between items-center py-1.5 px-2 rounded-lg bg-red-500/5 mb-1">
              <span className="text-sm truncate">{cv.customer.name}</span>
              <span className="text-sm font-bold text-red-400">{formatCurrency(cv.hourly)}/hr</span>
            </div>
          ))}
        </div>
      </div>
      {timed.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Job Difficulty vs Value</p>
          <div className="grid grid-cols-5 gap-2">
            {difficultyBuckets.map(bucket => (
              <div key={bucket.level} className="text-center p-2 rounded-lg bg-muted/30">
                <p className="text-[10px] text-muted-foreground">Diff {bucket.level}</p>
                <p className="text-xs font-bold text-primary">{bucket.count > 0 ? formatCurrency(bucket.hourly) : "—"}</p>
                <p className="text-[9px] text-muted-foreground">{bucket.count} jobs</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}