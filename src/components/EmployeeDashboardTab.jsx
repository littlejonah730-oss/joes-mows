import { useState, useEffect } from "react";
import { StatCard, Badge } from "@/components/ui/shared";
import { formatCurrency, formatDateShort, ROLE_CONFIG, ASSIGNMENT_CONFIG, getJobEmployeePay, hasCustomPay } from "@/lib/lawnCare";
import { LayoutDashboard, CalendarDays, Wallet, Users, RotateCcw } from "lucide-react";

function PayInput({ job, onUpdate }) {
  const [val, setVal] = useState(
    job.custom_employee_pay != null && job.custom_employee_pay !== "" ? String(job.custom_employee_pay) : ""
  );
  useEffect(() => {
    setVal(job.custom_employee_pay != null && job.custom_employee_pay !== "" ? String(job.custom_employee_pay) : "");
  }, [job.custom_employee_pay]);
  const custom = hasCustomPay(job);
  const defaultPay = Math.round(getJobEmployeePay({ ...job, custom_employee_pay: null }));
  const dirty = val !== (custom ? String(job.custom_employee_pay) : "");
  function commit() {
    if (val === "") {
      if (custom) onUpdate({ id: job.id, custom_employee_pay: null });
      return;
    }
    const n = Number(val);
    if (!Number.isNaN(n) && n !== Number(job.custom_employee_pay)) {
      onUpdate({ id: job.id, custom_employee_pay: n });
    }
  }
  return (
    <div className="flex items-center gap-1 shrink-0">
      <div className="relative">
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">$</span>
        <input
          type="number"
          inputMode="decimal"
          value={val}
          placeholder={String(defaultPay)}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
          className={`w-[64px] h-8 pl-4 pr-1 rounded-md border bg-transparent text-sm font-bold text-right ${
            custom ? "border-primary/60 neon-border" : "border-input"
          }`}
        />
      </div>
      {dirty && (
        <button
          onClick={commit}
          className="px-2 h-8 rounded-md bg-primary text-primary-foreground text-[10px] font-semibold hover:bg-primary/90"
        >
          Save
        </button>
      )}
      {custom && (
        <button
          onClick={() => {
            setVal("");
            onUpdate({ id: job.id, custom_employee_pay: null });
          }}
          title="Reset to default %"
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function JobRow({ job, onUpdate }) {
  const a = ASSIGNMENT_CONFIG[job.employee_assignment] || ASSIGNMENT_CONFIG.helping;
  const custom = hasCustomPay(job);
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-muted/30">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{job.customer_name}</p>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>{formatDateShort(job.scheduled_date)}</span>
          <Badge color={a.color} bg={a.bg}>{a.label}</Badge>
          <span className="hidden sm:inline">· {formatCurrency(job.price)} yard</span>
          {custom && <span className="text-primary font-semibold">custom</span>}
        </div>
      </div>
      <PayInput job={job} onUpdate={onUpdate} />
    </div>
  );
}

export default function EmployeeDashboardTab({ employees, jobs, onUpdate }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const active = employees.filter((e) => e.active !== false);

  const rows = active
    .map((emp) => {
      const mine = jobs.filter(
        (j) =>
          (j.claimed_by_employee_id === emp.id || j.exclusive_to_employee_id === emp.id) &&
          j.status !== "cancelled"
      );
      const todayJobs = mine.filter((j) => j.scheduled_date === todayStr && j.status !== "completed");
      const upcoming = mine
        .filter((j) => j.scheduled_date > todayStr && j.status !== "completed")
        .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
      const showJobs = todayJobs.length > 0 ? todayJobs : upcoming.slice(0, 1);
      const isToday = todayJobs.length > 0;
      const owed = showJobs.reduce((s, j) => s + getJobEmployeePay(j), 0);
      return { emp, showJobs, isToday, owed };
    })
    .sort(
      (a, b) =>
        (b.showJobs.length > 0 ? 1 : 0) - (a.showJobs.length > 0 ? 1 : 0) ||
        a.emp.name.localeCompare(b.emp.name)
    );

  const jobsTodayTotal = rows.reduce((s, r) => s + (r.isToday ? r.showJobs.length : 0), 0);
  const owedTodayTotal = rows.reduce((s, r) => s + (r.isToday ? r.owed : 0), 0);
  const workingToday = rows.filter((r) => r.isToday).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Active Employees" value={active.length} accent="bg-primary/10" />
        <StatCard icon={CalendarDays} label="Jobs Today" value={jobsTodayTotal} accent="bg-sky-500/10" />
        <StatCard icon={Wallet} label="Owed Today" value={formatCurrency(owedTodayTotal)} accent="bg-emerald-500/10" />
        <StatCard icon={LayoutDashboard} label="Working Today" value={workingToday} accent="bg-amber-500/10" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-semibold mb-1 flex items-center gap-2">
          <LayoutDashboard className="w-4 h-4 text-primary" /> Today's Board
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Each employee's jobs for today — or their next upcoming job. Edit the <span className="text-primary font-semibold">$</span> to set a custom payout per yard (overrides the 65% / 40% split).
        </p>
        <div className="space-y-3">
          {rows.map(({ emp, showJobs, isToday, owed }) => {
            const role = ROLE_CONFIG[emp.role] || ROLE_CONFIG.greenhorn;
            return (
              <div key={emp.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between mb-2">
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
                    <span className={`text-[10px] font-bold uppercase ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                      {isToday ? "Today" : "Next"}
                    </span>
                    {showJobs.length > 0 && <p className="text-sm font-bold text-emerald-400">{formatCurrency(owed)}</p>}
                  </div>
                </div>
                {showJobs.length > 0 ? (
                  <div className="space-y-1">
                    {showJobs.map((j) => (
                      <JobRow key={j.id} job={j} onUpdate={onUpdate} />
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic">No jobs scheduled.</p>
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