import { useState } from "react";
import { StatCard, Badge } from "@/components/ui/shared";
import { formatCurrency, formatDateShort, ROLE_CONFIG, getJobEmployeePay } from "@/lib/lawnCare";
import { DollarSign, CalendarCheck, CalendarClock, Users } from "lucide-react";

export default function EmployeePayrollTab({ employees, jobs }) {
  const [open, setOpen] = useState(null);

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);
  const inWeek = (d) => d && d >= startStr && d <= endStr;

  const active = employees.filter((e) => e.active !== false);

  const rows = active
    .map((emp) => {
      const mine = jobs.filter(
        (j) =>
          (j.claimed_by_employee_id === emp.id || j.exclusive_to_employee_id === emp.id) &&
          j.status !== "cancelled"
      );
      const completed = mine.filter((j) => j.status === "completed" && inWeek(j.scheduled_date));
      const scheduled = mine.filter((j) => j.status !== "completed" && inWeek(j.scheduled_date));
      const earned = completed.reduce((s, j) => s + getJobEmployeePay(j), 0);
      const projected = scheduled.reduce((s, j) => s + getJobEmployeePay(j), 0);
      return { emp, completed, scheduled, earned, projected };
    })
    .sort((a, b) => b.earned + b.projected - (a.earned + a.projected));

  const totalEarned = rows.reduce((s, r) => s + r.earned, 0);
  const totalProjected = rows.reduce((s, r) => s + r.projected, 0);
  const jobsCompleted = rows.reduce((s, r) => s + r.completed.length, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={DollarSign} label="Earned This Week" value={formatCurrency(totalEarned)} accent="bg-emerald-500/10" />
        <StatCard icon={CalendarCheck} label="Completed This Week" value={jobsCompleted} accent="bg-sky-500/10" />
        <StatCard icon={CalendarClock} label="Projected This Week" value={formatCurrency(totalProjected)} accent="bg-amber-500/10" />
        <StatCard icon={Users} label="Active Employees" value={active.length} accent="bg-primary/10" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-semibold mb-1 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" /> This Week's Payroll
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          {formatDateShort(startStr)} – {formatDateShort(endStr)} · tap an employee to see their jobs.
        </p>
        <div className="space-y-2">
          {rows.map(({ emp, completed, scheduled, earned, projected }) => {
            const role = ROLE_CONFIG[emp.role] || ROLE_CONFIG.greenhorn;
            const isOpen = open === emp.id;
            return (
              <div key={emp.id} className="rounded-xl border border-border">
                <button
                  onClick={() => setOpen(isOpen ? null : emp.id)}
                  className="w-full flex items-center justify-between p-3 text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">{emp.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{emp.name}</p>
                      <Badge color={role.color} bg={role.bg}>{role.label}</Badge>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-emerald-400">{formatCurrency(earned)}</p>
                    <p className="text-[10px] text-muted-foreground">+ {formatCurrency(projected)} projected</p>
                  </div>
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 space-y-2">
                    {completed.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">
                          Completed ({completed.length})
                        </p>
                        {completed.map((j) => (
                          <div key={j.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-muted/30">
                            <span className="truncate">{j.customer_name} · {formatDateShort(j.scheduled_date)}</span>
                            <span className="font-semibold text-emerald-400">{formatCurrency(getJobEmployeePay(j))}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {scheduled.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">
                          Scheduled ({scheduled.length})
                        </p>
                        {scheduled.map((j) => (
                          <div key={j.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-muted/20">
                            <span className="truncate">{j.customer_name} · {formatDateShort(j.scheduled_date)}</span>
                            <span className="font-semibold text-amber-400">{formatCurrency(getJobEmployeePay(j))}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {completed.length === 0 && scheduled.length === 0 && (
                      <p className="text-[11px] text-muted-foreground italic">Nothing this week.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {active.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No active employees.</p>
          )}
        </div>
      </div>
    </div>
  );
}