import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { isToday, formatCurrency, STATUS_CONFIG } from "@/lib/lawnCare";

// Persistent overlay for the Background slideshow: a live clock (always) and
// a "Today" dashboard listing today's jobs with their current statuses.
export default function TodayHud({ jobs }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const todayJobs = jobs.filter((j) => isToday(j.scheduled_date));
  const counts = {};
  Object.keys(STATUS_CONFIG).forEach((k) => { counts[k] = todayJobs.filter((j) => j.status === k).length; });
  const total = todayJobs.reduce((s, j) => s + (j.price || 0), 0);

  const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const date = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return (
    <>
      {/* live clock — always visible */}
      <div className="absolute top-3 right-4 z-30 text-right pointer-events-none">
        <p className="text-2xl lg:text-4xl font-bold tabular-nums neon-text leading-none">{time}</p>
        <p className="text-[10px] lg:text-xs text-muted-foreground uppercase tracking-widest mt-1">{date}</p>
      </div>

      {/* today dashboard — always visible */}
      <div className="absolute bottom-4 left-4 z-30 w-60 max-w-[44vw] rounded-2xl border border-border bg-card/80 glass p-3 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-primary" /> Today
          </p>
          <p className="text-[10px] text-muted-foreground">{todayJobs.length} jobs · {formatCurrency(total)}</p>
        </div>
        <div className="flex flex-wrap gap-1 mb-2">
          {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
            counts[k] > 0 ? (
              <span key={k} className={`text-[10px] px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label} {counts[k]}</span>
            ) : null
          ))}
          {todayJobs.length === 0 && <span className="text-[10px] text-muted-foreground italic">No jobs today</span>}
        </div>
        <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
          {todayJobs.slice(0, 10).map((j) => {
            const cfg = STATUS_CONFIG[j.status] || STATUS_CONFIG.scheduled;
            return (
              <div key={j.id} className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
                <span className="text-[11px] truncate flex-1">{j.customer_name}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{formatCurrency(j.price)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}