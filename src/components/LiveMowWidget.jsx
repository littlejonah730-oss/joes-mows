import { useEffect, useState } from "react";
import { useEntityCollection } from "@/hooks/useEntityCollection";
import { Timer, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

function formatElapsed(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

// Live banner shown while any job is in progress (owner or crew started).
// Big ticking timer + "X done · Next: ..." subscript for today's yards.
export default function LiveMowWidget() {
  const { data: jobs = [] } = useEntityCollection("Job");
  const activeJobs = jobs.filter((j) => j.status === "in_progress" && j.timer_started_at);
  const [now, setNow] = useState(Date.now());

  const hasActive = activeJobs.length > 0;
  useEffect(() => {
    if (!hasActive) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [hasActive]);

  if (!hasActive) return null;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayJobs = jobs.filter((j) => j.scheduled_date === todayStr && j.status !== "cancelled");
  const doneToday = todayJobs.filter((j) => j.status === "completed").length;
  const nextNames = todayJobs.filter((j) => j.status === "scheduled").map((j) => j.customer_name);

  const subParts = [];
  if (doneToday > 0) subParts.push(`${doneToday} done`);
  if (nextNames.length > 0) subParts.push(`Next: ${nextNames.slice(0, 3).join(", ")}${nextNames.length > 3 ? "…" : ""}`);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/50 bg-card p-4 lg:p-5 mb-6 neon-glow select-none">
      <div className="absolute top-0 left-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl blob-drift" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
          </span>
          <span className="text-xs font-bold text-primary uppercase tracking-widest neon-text">Now Mowing</span>
        </div>
        {activeJobs.map((job) => {
          const elapsed = now - new Date(job.timer_started_at).getTime();
          return (
            <div key={job.id} className="flex items-center gap-4 flex-wrap">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-base lg:text-lg truncate">{job.customer_name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {job.customer_address || job.job_type}
                  {job.started_by_name ? ` · ${job.started_by_name}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-primary shrink-0" />
                <span className="font-mono text-2xl lg:text-3xl font-bold text-primary tabular-nums neon-text">
                  {formatElapsed(elapsed)}
                </span>
              </div>
            </div>
          );
        })}
        {subParts.length > 0 && (
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1 flex-wrap">
            {subParts.join(" · ")}
            <Link to="/jobs" className="inline-flex items-center gap-0.5 text-primary font-medium">
              Jobs <ChevronRight className="w-3 h-3" />
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}