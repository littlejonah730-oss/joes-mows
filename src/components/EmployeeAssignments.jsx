import { formatCurrency, formatDateShort } from "@/lib/lawnCare";
import { UserCheck, Calendar } from "lucide-react";

export default function EmployeeAssignments({ jobs, employees }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const claimed = jobs.filter((j) => j.claimed_by_employee_id);

  const byEmp = employees
    .filter((e) => claimed.some((j) => j.claimed_by_employee_id === e.id))
    .map((e) => {
      const ej = claimed.filter((j) => j.claimed_by_employee_id === e.id);
      const upcoming = ej
        .filter((j) => j.scheduled_date >= todayStr && j.status !== "cancelled" && j.status !== "completed")
        .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
      const recentCompleted = ej.filter((j) => j.status === "completed").length;
      const total = upcoming.reduce((s, j) => s + (j.price || 0), 0);
      return { emp: e, upcoming, recentCompleted, total };
    })
    .sort((a, b) => b.upcoming.length - a.upcoming.length);

  if (byEmp.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 mb-6">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><UserCheck className="w-4 h-4 text-primary" /> Assignments by Employee</h2>
        <p className="text-xs text-muted-foreground text-center py-4">No jobs claimed yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 mb-6">
      <h2 className="font-semibold mb-3 flex items-center gap-2"><UserCheck className="w-4 h-4 text-primary" /> Assignments by Employee</h2>
      <div className="space-y-3">
        {byEmp.map(({ emp, upcoming, recentCompleted, total }) => (
          <div key={emp.id} className="rounded-xl border border-border p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">{emp.name?.charAt(0)?.toUpperCase()}</span>
                </div>
                <span className="text-sm font-semibold truncate">{emp.name}</span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-bold text-primary">{upcoming.length} upcoming</span>
                {upcoming.length > 0 && <p className="text-[10px] text-muted-foreground">{formatCurrency(total)}</p>}
              </div>
            </div>
            {upcoming.length > 0 ? (
              <div className="space-y-1">
                {upcoming.slice(0, 6).map((j) => (
                  <div key={j.id} className="flex items-center gap-2 text-xs py-1 px-2 rounded-lg bg-muted/30">
                    <Calendar className="w-3 h-3 text-primary shrink-0" />
                    <span className="text-muted-foreground w-16 shrink-0">{formatDateShort(j.scheduled_date)}</span>
                    <span className="flex-1 truncate">{j.customer_name}</span>
                    <span className="font-semibold shrink-0">{formatCurrency(j.price)}</span>
                  </div>
                ))}
                {upcoming.length > 6 && <p className="text-[10px] text-muted-foreground px-2">+{upcoming.length - 6} more</p>}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground italic">No upcoming jobs{recentCompleted > 0 ? ` · ${recentCompleted} completed` : ""}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}