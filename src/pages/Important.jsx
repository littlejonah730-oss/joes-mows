import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useEntityCollection } from "@/hooks/useEntityCollection";
import { base44 } from "@/api/base44Client";
import { PageHeader, LoadingState } from "@/components/ui/shared";
import { getChecklist, getTaskStatus } from "@/lib/equipmentMaintenance";
import { formatCurrency, formatDate, isToday } from "@/lib/lawnCare";
import {
  Clock, DollarSign, FileSpreadsheet, Leaf, Wrench, AlertTriangle, TrendingDown, Sun, Snowflake
} from "lucide-react";

const RETENTION_INTERVALS = { weekly: 7, biweekly: 14, monthly: 30 };
const DAY_MS = 86400000;

function ChecklistItem({ icon: Icon, tone = "info", title, sub, to }) {
  const toneCls = tone === "danger"
    ? "border-red-500/30 bg-red-500/5"
    : tone === "warning"
      ? "border-amber-500/30 bg-amber-500/5"
      : tone === "ok"
        ? "border-emerald-500/30 bg-emerald-500/5"
        : "border-border bg-muted/30";
  const iconCls = tone === "danger" ? "text-red-400" : tone === "warning" ? "text-amber-400" : tone === "ok" ? "text-emerald-400" : "text-primary";
  const inner = (
    <>
      <Icon className={`w-4 h-4 shrink-0 ${iconCls}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{title}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>}
      </div>
    </>
  );
  if (to) {
    return <Link to={to} className={`flex items-center gap-3 p-3 rounded-xl border transition-all hover:border-primary/40 ${toneCls}`}>{inner}</Link>;
  }
  return <div className={`flex items-center gap-3 p-3 rounded-xl border ${toneCls}`}>{inner}</div>;
}

function Section({ icon: Icon, title, items, emptyText }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 lg:p-5">
      <h2 className="font-semibold mb-3 flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" /> {title}
        <span className="text-xs text-muted-foreground font-normal">({items.length})</span>
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-3 text-center">{emptyText}</p>
      ) : (
        <div className="space-y-2">{items}</div>
      )}
    </div>
  );
}

export default function Important() {
  const { data: jobs = [], isLoading } = useEntityCollection("Job");
  const { data: invoices = [] } = useEntityCollection("Invoice");
  const { data: expenses = [] } = useEntityCollection("Expense");
  const { data: customers = [] } = useEntityCollection("Customer");
  const { data: equipment = [] } = useEntityCollection("Equipment");
  const { data: usage = [] } = useEntityCollection("EquipmentUsage");
  const [sheets, setSheets] = useState(null);

  useEffect(() => {
    base44.functions.invoke("exportExpensesToSheets", { mode: "status" })
      .then((res) => setSheets(res?.data || { connected: false }))
      .catch(() => setSheets({ connected: false }));
  }, []);

  if (isLoading) return <LoadingState />;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const threeDaysStr = new Date(today.getTime() + 3 * DAY_MS).toISOString().slice(0, 10);

  // ---- Daily: today's jobs + payments due/overdue ----
  const todayPending = jobs.filter((j) => isToday(j.scheduled_date) && ["scheduled", "in_progress", "paused"].includes(j.status));
  const dueSoon = invoices
    .filter((i) => i.status === "unpaid" && i.due_date && String(i.due_date).slice(0, 10) <= threeDaysStr)
    .map((i) => {
      const due = String(i.due_date).slice(0, 10);
      const daysOver = Math.round((today - new Date(due + "T00:00:00")) / DAY_MS);
      return { inv: i, daysOver };
    });
  const dailyItems = [
    ...todayPending.map((j) => (
      <ChecklistItem
        key={`job-${j.id}`}
        icon={Clock}
        tone={j.status === "in_progress" ? "warning" : "info"}
        title={`${j.status === "in_progress" ? "Finish" : "Start"}: ${j.customer_name} — ${j.job_type}`}
        sub={j.customer_address}
        to="/jobs"
      />
    )),
    ...dueSoon.map(({ inv, daysOver }) => (
      <ChecklistItem
        key={`inv-${inv.id}`}
        icon={AlertTriangle}
        tone={daysOver > 0 ? "danger" : "warning"}
        title={`Payment: ${inv.customer_name} — ${formatCurrency(inv.amount)}`}
        sub={daysOver > 0 ? `${daysOver} day${daysOver === 1 ? "" : "s"} overdue (due ${formatDate(inv.due_date)})` : `Due ${formatDate(inv.due_date)}`}
        to="/invoices"
      />
    )),
  ];

  // ---- Maintenance statuses across the fleet ----
  const allDue = [];
  equipment.forEach((eq) => {
    const eqUsage = usage.filter((u) => u.equipment_id === eq.id);
    getChecklist(eq).forEach((task) => {
      const st = getTaskStatus(eq, task, eqUsage, today);
      if (st.due) allDue.push({ eq, task, st });
    });
  });
  const maintSub = (d) =>
    d.st.overdueJobs > 0
      ? `Overdue by ${d.st.overdueJobs} job${d.st.overdueJobs === 1 ? "" : "s"}`
      : d.st.overdueDays > 0
        ? `Overdue by ${d.st.overdueDays} day${d.st.overdueDays === 1 ? "" : "s"}`
        : d.st.seasonal
          ? "Due this season"
          : "Due now";

  // ---- Weekly: money summary + maintenance due ----
  const weekStart = new Date(today);
  const dow = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() + (dow === 0 ? -6 : 1 - dow));
  const inWeek = (dStr) => {
    const d = new Date(String(dStr).slice(0, 10) + "T00:00:00");
    return d >= weekStart && d <= today;
  };
  const collected = invoices.filter((i) => i.status === "paid" && i.paid_date && inWeek(i.paid_date)).reduce((s, i) => s + (i.amount || 0), 0);
  const spent = expenses.filter((e) => e.date && inWeek(e.date)).reduce((s, e) => s + (e.amount || 0), 0);
  const weeklyItems = [
    <ChecklistItem
      key="money"
      icon={DollarSign}
      tone="ok"
      title={`This week: ${formatCurrency(collected)} collected · ${formatCurrency(spent)} spent`}
      sub={`Net ${formatCurrency(collected - spent)} so far`}
      to="/reports"
    />,
    ...allDue
      .filter((d) => d.task.everyDays || d.st.overdueJobs > 0)
      .map((d) => (
        <ChecklistItem
          key={`maint-${d.eq.id}-${d.task.id}`}
          icon={Wrench}
          tone={d.st.overdueJobs > 0 || d.st.overdueDays > 14 ? "danger" : "warning"}
          title={`${d.eq.name}: ${d.task.label}`}
          sub={maintSub(d)}
          to="/equipment"
        />
      )),
  ];

  // ---- Monthly: retention watch + expense export status ----
  const retentionFlags = [];
  customers
    .filter((c) => c.active !== false)
    .forEach((c) => {
      const custJobs = jobs.filter((j) => j.customer_id === c.id && j.status === "completed");
      if (custJobs.length === 0) return;
      const last = [...custJobs].sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date))[0];
      const lastDate = new Date(String(last.scheduled_date).slice(0, 10) + "T00:00:00");
      const daysSince = Math.round((today - lastDate) / DAY_MS);
      const rule = c.recurring_rule || last.recurring_rule || "by_request";
      if (["weekly", "biweekly", "monthly"].includes(rule)) {
        const dev = RETENTION_INTERVALS[rule] - daysSince;
        if (dev <= -14) retentionFlags.push({ c, level: "danger", text: `${daysSince} days since last job (usually every ${RETENTION_INTERVALS[rule]})` });
        else if (dev < 0) retentionFlags.push({ c, level: "warning", text: `Running ${-dev} days late on their ${rule} schedule` });
      } else if (daysSince >= 60) {
        retentionFlags.push({ c, level: "danger", text: `${daysSince} days since last job` });
      } else if (daysSince >= 30) {
        retentionFlags.push({ c, level: "warning", text: `${daysSince} days since last job` });
      }
    });
  retentionFlags.sort((a, b) => (a.level === b.level ? 0 : a.level === "danger" ? -1 : 1));

  const monthlyItems = [
    ...retentionFlags.map((f) => (
      <ChecklistItem
        key={`ret-${f.c.id}`}
        icon={TrendingDown}
        tone={f.level}
        title={`${f.c.name} — retention risk`}
        sub={f.text}
        to={`/customers/${f.c.id}`}
      />
    )),
    <ChecklistItem
      key="export"
      icon={FileSpreadsheet}
      tone={sheets && sheets.connected ? (sheets.last_export_month ? "ok" : "warning") : "warning"}
      title="Monthly expense export to Google Sheets"
      sub={
        sheets && sheets.connected
          ? sheets.last_export_month
            ? `Last export: ${sheets.last_export_month} (${sheets.last_export_date})`
            : "Connected — first export runs on the 1st of next month"
          : "Google Sheets not connected — export is skipped until you connect it in Settings"
      }
      to="/settings"
    />,
  ];

  // ---- Seasonal: seasonal maintenance + service reminders (real data) ----
  const month = today.getMonth();
  const mowingCustomers = customers.filter((c) => c.active !== false && c.service_line === "mowing" && c.is_recurring);
  const leavesCustomers = customers.filter((c) => c.active !== false && c.service_line === "leaves");
  const lightsCustomers = customers.filter((c) => c.active !== false && c.service_line === "lights");
  const upcomingLeafJobs = jobs.filter((j) => j.service_line === "leaves" && j.status !== "cancelled" && String(j.scheduled_date).slice(0, 10) >= todayStr);

  const seasonalReminders = [];
  if (month === 1 || month === 2) {
    seasonalReminders.push({ icon: Sun, title: `Mowing season starts in March — ${mowingCustomers.length} recurring mowing customer${mowingCustomers.length === 1 ? "" : "s"} to reactivate`, sub: "Recurring job auto-creation resumes in March" });
  }
  if (month === 7 || month === 8) {
    seasonalReminders.push({ icon: Leaf, title: `Leaf season ramp-up — ${leavesCustomers.length} leaf customer${leavesCustomers.length === 1 ? "" : "s"}, ${upcomingLeafJobs.length} leaf job${upcomingLeafJobs.length === 1 ? "" : "s"} scheduled`, sub: "Queue up leaf cleanups across the leaf service line" });
  }
  if (month === 9) {
    seasonalReminders.push({ icon: Sun, title: "Last month of mowing season", sub: "Recurring jobs pause Nov–Feb — wrap up and plan winter services" });
  }
  if (month === 10 || month === 11) {
    seasonalReminders.push({ icon: Snowflake, title: `Winter — Christmas lights season: ${lightsCustomers.length} lights customer${lightsCustomers.length === 1 ? "" : "s"}`, sub: "Mowing is suspended Nov–Feb; focus on lights installs" });
  }

  const seasonalItems = [
    ...allDue
      .filter((d) => d.st.seasonal)
      .map((d) => (
        <ChecklistItem
          key={`season-${d.eq.id}-${d.task.id}`}
          icon={Wrench}
          tone="warning"
          title={`${d.eq.name}: ${d.task.label}`}
          sub="Due this season"
          to="/equipment"
        />
      )),
    ...seasonalReminders.map((r, i) => (
      <ChecklistItem key={`rem-${i}`} icon={r.icon} tone="info" title={r.title} sub={r.sub} />
    )),
  ];

  return (
    <div>
      <PageHeader title="Important" subtitle="Your daily, weekly, monthly, and seasonal checklist" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section icon={Clock} title="Daily" items={dailyItems} emptyText="All clear — no jobs or payments need attention today." />
        <Section icon={DollarSign} title="Weekly" items={weeklyItems} emptyText="Nothing due this week." />
        <Section icon={FileSpreadsheet} title="Monthly" items={monthlyItems} emptyText="No monthly flags right now." />
        <Section icon={Leaf} title="Seasonal" items={seasonalItems} emptyText="No seasonal items right now." />
      </div>
    </div>
  );
}