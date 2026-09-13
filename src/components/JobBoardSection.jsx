import { Badge } from "@/components/ui/shared";
import { ASSIGNMENT_CONFIG, STATUS_CONFIG, formatCurrency, formatDateShort, formatDayOfWeek } from "@/lib/lawnCare";
import { ClipboardList, MapPin, UserCheck, Clock } from "lucide-react";

export default function JobBoardSection({ jobs, onClearPast, pastCount = 0, clearing }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const highlighted = jobs
    .filter((j) => j.highlighted && j.status !== "cancelled" && j.status !== "completed" && j.scheduled_date >= todayStr)
    .sort((a, b) => {
      const aExcl = a.exclusive_to_employee_id ? 0 : 1;
      const bExcl = b.exclusive_to_employee_id ? 0 : 1;
      if (aExcl !== bExcl) return aExcl - bExcl;
      return new Date(a.scheduled_date) - new Date(b.scheduled_date);
    });

  if (highlighted.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 mb-6">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-primary" />
          Job Board
        </h2>
        <p className="text-xs text-muted-foreground text-center py-4">No jobs on the board. Highlight jobs to make them visible here.</p>
      </div>
    );
  }

  const byDate = [];
  highlighted.forEach((job) => {
    let group = byDate.find((g) => g.date === job.scheduled_date);
    if (!group) { group = { date: job.scheduled_date, jobs: [] }; byDate.push(group); }
    group.jobs.push(job);
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-4 mb-6">
      <div className="flex items-center justify-between mb-3 gap-2">
        <h2 className="font-semibold flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-primary" />
          Job Board ({highlighted.length})
        </h2>
        {pastCount > 0 && onClearPast && (
          <button onClick={onClearPast} disabled={clearing} className="text-[11px] font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 shrink-0">
            {clearing ? "Clearing…" : `Clear ${pastCount} Past`}
          </button>
        )}
      </div>
      <div className="space-y-4">
        {byDate.map((group) => (
          <div key={group.date}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="text-xs font-bold text-primary">{formatDateShort(group.date)}</span>
              <span className="text-[10px] text-muted-foreground">{formatDayOfWeek(group.date)}</span>
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs font-bold text-muted-foreground">{group.jobs.length} job{group.jobs.length > 1 ? "s" : ""}</span>
            </div>
            <div className="space-y-2">
              {group.jobs.map((job) => {
                const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.scheduled;
                const assignCfg = ASSIGNMENT_CONFIG[job.employee_assignment];
                return (
                  <div key={job.id} className={`rounded-lg border p-3 ${job.exclusive_to_employee_id ? "border-primary/50 bg-primary/5" : "border-border"}`}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium">{job.customer_name}</p>
                          {job.exclusive_to_employee_name && (
                            <span className="text-[9px] font-bold text-primary bg-primary/15 px-1.5 py-0.5 rounded">🔒 {job.exclusive_to_employee_name}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{job.job_type}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {assignCfg && <Badge color={assignCfg.color} bg={assignCfg.bg}>{assignCfg.label}</Badge>}
                        <Badge color={cfg.color} bg={cfg.bg}>{cfg.label}</Badge>
                      </div>
                    </div>
                    {job.customer_address && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> {job.customer_address}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-bold">{formatCurrency(job.price)}</span>
                      {job.claimed_by_name ? (
                        <span className="text-xs text-primary flex items-center gap-1"><UserCheck className="w-3 h-3" /> {job.claimed_by_name}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unclaimed</span>
                      )}
                    </div>
                    {job.timer_started_at && !job.timer_duration_seconds && (
                      <p className="text-[10px] text-amber-400 flex items-center gap-1 mt-1"><Clock className="w-3 h-3" /> Timer running</p>
                    )}
                    {job.timer_duration_seconds > 0 && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1"><Clock className="w-3 h-3" /> {Math.floor(job.timer_duration_seconds / 60)}m {job.timer_duration_seconds % 60}s</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}