import { useMemo } from "react";
import { Link } from "react-router-dom";
import { RECURRING_CONFIG } from "@/lib/lawnCare";
import { Clock, AlertTriangle, UserCheck, Phone, CalendarClock } from "lucide-react";

const INTERVALS = { weekly: 7, biweekly: 14, monthly: 30 };

export default function RetentionWatch({ customers = [], jobs = [] }) {
  const rows = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return customers
      .filter((c) => c.active !== false)
      .map((c) => {
        const custJobs = jobs.filter((j) => j.customer_id === c.id && j.status === "completed");
        const sorted = custJobs.sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date));
        const lastJob = sorted[0];
        const lastDate = lastJob ? new Date(lastJob.scheduled_date + "T00:00:00") : null;
        const daysSince = lastDate ? Math.round((now - lastDate) / 86400000) : null;
        const rule = c.recurring_rule || lastJob?.recurring_rule || "by_request";
        const isRecurring = ["weekly", "biweekly", "monthly"].includes(rule);
        const interval = INTERVALS[rule];
        const deviation = isRecurring && daysSince != null ? interval - daysSince : null;
        return { customer: c, lastJob, daysSince, jobCount: custJobs.length, isRecurring, rule, interval, deviation };
      })
      .filter((r) => r.daysSince !== null)
      .sort((a, b) => b.daysSince - a.daysSince);
  }, [customers, jobs]);

  function getRisk(r) {
    if (r.isRecurring && r.deviation != null) {
      if (r.deviation <= -14) return { level: "critical", color: "border-red-500/30 bg-red-500/5", text: "text-red-400", label: "Critical" };
      if (r.deviation < 0) return { level: "warning", color: "border-amber-500/30 bg-amber-500/5", text: "text-amber-400", label: "Late" };
      return { level: "ok", color: "border-emerald-500/30 bg-emerald-500/5", text: "text-emerald-400", label: "On Track" };
    }
    if (r.daysSince >= 60) return { level: "critical", color: "border-red-500/30 bg-red-500/5", text: "text-red-400", label: "Critical" };
    if (r.daysSince >= 30) return { level: "warning", color: "border-amber-500/30 bg-amber-500/5", text: "text-amber-400", label: "At Risk" };
    return { level: "ok", color: "border-emerald-500/30 bg-emerald-500/5", text: "text-emerald-400", label: "Recent" };
  }

  function DeviationBadge({ deviation }) {
    if (deviation == null) return null;
    if (deviation === 0) return <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">ON TIME</span>;
    if (deviation > 0) return <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">+{deviation}d</span>;
    return <span className="text-[9px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">{deviation}d</span>;
  }

  const critical = rows.filter((r) => getRisk(r).level === "critical");
  const warning = rows.filter((r) => getRisk(r).level === "warning");
  const recent = rows.filter((r) => getRisk(r).level === "ok");

  return (
    <div>
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 mb-4">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <CalendarClock className="w-3.5 h-3.5 text-primary" />
          Days since each customer's last completed job. Recurring customers show how far off they are from their usual interval (weekly 7 · biweekly 14 · monthly 30). A negative number means you're running late.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-center">
          <p className="text-2xl font-bold text-red-400">{critical.length}</p>
          <p className="text-[9px] text-muted-foreground uppercase">Critical</p>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-center">
          <p className="text-2xl font-bold text-amber-400">{warning.length}</p>
          <p className="text-[9px] text-muted-foreground uppercase">Late / At Risk</p>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-center">
          <p className="text-2xl font-bold text-emerald-400">{recent.length}</p>
          <p className="text-[9px] text-muted-foreground uppercase">On Track</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No completed jobs yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const risk = getRisk(r);
            const digits = r.customer.phone ? r.customer.phone.replace(/\D/g, "") : "";
            return (
              <div key={r.customer.id} className={`rounded-xl border ${risk.color} p-3 flex items-center gap-3`}>
                <div className={`shrink-0 ${risk.text}`}>
                  {risk.level === "critical" ? <AlertTriangle className="w-5 h-5" /> : risk.level === "warning" ? <Clock className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                </div>
                <Link to={`/customers/${r.customer.id}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium truncate">{r.customer.name}</p>
                    {r.isRecurring && <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">{RECURRING_CONFIG[r.rule]?.label || "Recurring"}</span>}
                    <DeviationBadge deviation={r.deviation} />
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{r.customer.address || "No address"}</p>
                </Link>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${risk.text}`}>{r.daysSince}d</p>
                  <p className="text-[9px] text-muted-foreground">{r.jobCount} jobs</p>
                </div>
                {digits && (
                  <a href={`tel:${digits}`} className="shrink-0 p-1.5 rounded-lg bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}