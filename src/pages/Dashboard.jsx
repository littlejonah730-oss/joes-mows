import { useState } from "react";
import { Link } from "react-router-dom";
import { useEntityCollection } from "@/hooks/useEntityCollection";
import { StatCard, PageHeader, LoadingState, EmptyState } from "@/components/ui/shared";
import { STATUS_CONFIG, PAYMENT_CONFIG, formatCurrency, formatDate, isToday, isOverdue } from "@/lib/lawnCare";
import { getBaseJobMinutes } from "@/lib/baseJobEstimates";
import {
  DollarSign, Clock, Users, ClipboardList, TrendingUp, Plus, Calendar as CalIcon,
  FileText, UserPlus, StickyNote, Sun, AlertTriangle, Zap, Wrench, Landmark
} from "lucide-react";
import QuickAddDialog from "@/components/QuickAddDialog";
import LiveMowWidget from "@/components/LiveMowWidget";
import BusinessInsightPanel from "@/components/BusinessInsightPanel";
import BusinessOverview from "@/components/insights/BusinessOverview";
import AddressLink from "@/components/AddressLink";

export default function Dashboard() {
  const { data: customers = [], isLoading: cLoading } = useEntityCollection("Customer");
  const { data: jobs = [], isLoading: jLoading } = useEntityCollection("Job", { sort: "-created_date" });
  const { data: invoices = [], isLoading: iLoading } = useEntityCollection("Invoice");
  const { data: expenses = [], isLoading: eLoading } = useEntityCollection("Expense");
  const { data: equipment = [] } = useEntityCollection("Equipment");
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const loading = cLoading || jLoading || iLoading || eLoading;
  if (loading) return <LoadingState />;

  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const unpaidInvoices = invoices.filter((i) => i.status === "unpaid");
  const totalRevenue = paidInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);
  const outstanding = unpaidInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);
  const activeJobs = jobs.filter((j) => ["scheduled", "in_progress"].includes(j.status));
  const todayJobs = jobs.filter((j) => isToday(j.scheduled_date) && j.status !== "cancelled");
  const predictedIncome = activeJobs.reduce((sum, j) => sum + (j.price || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const equipmentValue = equipment.reduce((sum, e) => sum + (e.purchase_price || 0), 0);
  const businessNetWorth = equipmentValue + netProfit + outstanding;

  // Weekly hours tracking — estimated job times (recorded time, else customer avg, else base estimate)
  const trackingStart = new Date(new Date().getFullYear(), 2, 1);
  const now = new Date();
  function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday as start
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const currentWeekStart = getWeekStart(now);

  // Average recorded job time per customer (completed, timed jobs only)
  const avgJobByCustomer = {};
  jobs.forEach((j) => {
    if (j.status === "completed" && (j.timer_duration_seconds || 0) > 0) {
      if (!avgJobByCustomer[j.customer_id]) avgJobByCustomer[j.customer_id] = { sum: 0, count: 0 };
      avgJobByCustomer[j.customer_id].sum += j.timer_duration_seconds;
      avgJobByCustomer[j.customer_id].count += 1;
    }
  });
  function getEstJobSeconds(job) {
    if (job.timer_duration_seconds > 0) return job.timer_duration_seconds;
    const a = avgJobByCustomer[job.customer_id];
    const avg = a ? Math.round(a.sum / a.count) : 0;
    return avg > 0 ? avg : getBaseJobMinutes(job.customer_name) * 60;
  }

  const weekMap = new Map();
  jobs.forEach((j) => {
    if (j.status === "cancelled") return;
    const d = j.scheduled_date ? new Date(j.scheduled_date.length === 10 ? j.scheduled_date + "T00:00:00" : j.scheduled_date) : null;
    if (!d || d < trackingStart) return;
    const key = getWeekStart(d).toISOString();
    if (!weekMap.has(key)) weekMap.set(key, { hours: 0, days: new Set() });
    const w = weekMap.get(key);
    w.hours += getEstJobSeconds(j) / 3600;
    w.days.add(d.toDateString());
  });
  let totalHoursAllWeeks = 0, weeksTracked = 0, totalHoursThisWeek = 0, daysWorkedThisWeek = 0;
  weekMap.forEach((w, key) => {
    const ws = new Date(key);
    if (ws < currentWeekStart) { totalHoursAllWeeks += w.hours; weeksTracked++; }
    else if (ws.getTime() === currentWeekStart.getTime()) { totalHoursThisWeek = w.hours; daysWorkedThisWeek = w.days.size; }
  });
  const avgHoursPerWeek = weeksTracked > 0 ? totalHoursAllWeeks / weeksTracked : totalHoursThisWeek;
  const avgHoursPerDay = daysWorkedThisWeek > 0 ? totalHoursThisWeek / daysWorkedThisWeek : 0;

  const paymentBreakdown = ["cash", "venmo", "cashapp", "check"].map((method) => {
    const methodInvoices = paidInvoices.filter((i) => i.payment_method === method);
    const total = methodInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);
    return { method, total, count: methodInvoices.length };
  });

  const recentInvoices = invoices.slice(0, 5);
  const upcomingJobs = jobs
    .filter((j) => ["scheduled", "in_progress"].includes(j.status))
    .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))
    .slice(0, 5);

  const overdueInvoices = invoices.filter(isOverdue);

  const quickActions = [
    { label: "New Job", icon: ClipboardList, color: "bg-primary/10 text-primary", action: () => setQuickAddOpen("job") },
    { label: "New Customer", icon: UserPlus, color: "bg-blue-500/10 text-blue-400", action: () => setQuickAddOpen("customer") },
    { label: "New Invoice", icon: FileText, color: "bg-amber-500/10 text-amber-400", action: () => setQuickAddOpen("invoice") },
    { label: "New Note", icon: StickyNote, color: "bg-purple-500/10 text-purple-400", action: () => setQuickAddOpen("note") },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Your business at a glance" />
      <LiveMowWidget />
      <BusinessOverview />

      <BusinessInsightPanel />

      <div className="rounded-2xl border border-border bg-card p-4 lg:p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2"><CalIcon className="w-4 h-4 text-primary" /> Today</h2>
          <span className="text-xs text-muted-foreground">{todayJobs.length} job{todayJobs.length === 1 ? "" : "s"}</span>
        </div>
        {todayJobs.length === 0 ? (
          <div className="flex items-center gap-3 py-2">
            <Sun className="w-5 h-5 text-primary/60" />
            <p className="text-sm text-muted-foreground">Nothing scheduled for today. Enjoy the breather!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayJobs.map((job) => {
              const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.scheduled;
              return (
                <div key={job.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40">
                  <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{job.customer_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{job.job_type}{job.customer_address ? " · " : ""}{job.customer_address && <AddressLink address={job.customer_address} />}</p>
                  </div>
                  <span className="text-sm font-medium">{formatCurrency(job.price)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {quickActions.map((qa) => {
          const Icon = qa.icon;
          return (
            <button key={qa.label} onClick={qa.action}
              className="flex items-center gap-3 p-3 lg:p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:neon-glow transition-all group">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${qa.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium">{qa.label}</span>
              <Plus className="w-4 h-4 ml-auto text-muted-foreground group-hover:text-primary" />
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard icon={Landmark} label="Business Net Worth" value={formatCurrency(businessNetWorth)} sublabel={`Equip ${formatCurrency(equipmentValue)} + Cash ${formatCurrency(netProfit)} + Owed ${formatCurrency(outstanding)}`} accent="bg-primary/10" />
        <StatCard icon={DollarSign} label="Total Revenue" value={formatCurrency(totalRevenue)} sublabel={`${paidInvoices.length} paid invoices`} accent="bg-emerald-500/10" />
        <StatCard icon={Clock} label="Outstanding" value={formatCurrency(outstanding)} sublabel={`${unpaidInvoices.length} unpaid invoices`} accent="bg-amber-500/10" />
        <StatCard icon={ClipboardList} label="Active Jobs" value={activeJobs.length} sublabel={`${todayJobs.length} today`} accent="bg-primary/10" />
        <StatCard icon={TrendingUp} label="Predicted Income" value={formatCurrency(predictedIncome)} sublabel="From scheduled jobs" accent="bg-purple-500/10" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <StatCard icon={Users} label="Customers" value={customers.length} sublabel={`${customers.filter((c) => c.active).length} active`} />
        <StatCard icon={ClipboardList} label="Jobs Today" value={todayJobs.length} sublabel={`${activeJobs.length} total active`} />
        <StatCard icon={Zap} label="Avg Mow Price" value={formatCurrency(jobs.length ? jobs.reduce((s, j) => s + (j.price || 0), 0) / jobs.length : 0)} sublabel="Across all jobs" />
        <StatCard icon={DollarSign} label="Net Profit" value={formatCurrency(netProfit)} sublabel={`${formatCurrency(totalExpenses)} expenses`} accent="bg-red-500/10" />
        <StatCard icon={Wrench} label="Avg Hrs/Week" value={`${avgHoursPerWeek.toFixed(2)}h`} sublabel={`${weeksTracked} wks tracked`} accent="bg-blue-500/10" />
        <StatCard icon={Clock} label="Avg Hrs/Day" value={`${avgHoursPerDay.toFixed(2)}h`} sublabel={`${daysWorkedThisWeek} days this wk`} accent="bg-primary/10" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" /> Payment Method Breakdown</h2>
          <span className="text-xs text-muted-foreground">{formatCurrency(totalRevenue)} total</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {paymentBreakdown.map((pb) => {
            const cfg = PAYMENT_CONFIG[pb.method];
            const pct = totalRevenue > 0 ? (pb.total / totalRevenue) * 100 : 0;
            return (
              <div key={pb.method} className="rounded-xl border border-border p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{cfg.icon}</span>
                  <span className="text-xs font-medium">{cfg.label}</span>
                </div>
                <p className="text-lg font-bold">{formatCurrency(pb.total)}</p>
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{pb.count} payments</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2"><CalIcon className="w-4 h-4 text-primary" /> Upcoming Jobs</h2>
            <Link to="/jobs" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {upcomingJobs.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No upcoming jobs" subtitle="Schedule a job to get started" />
          ) : (
            <div className="space-y-2">
              {upcomingJobs.map((job) => {
                const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.scheduled;
                return (
                  <Link key={job.id} to="/jobs" className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors">
                    <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{job.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{job.job_type} · {formatDate(job.scheduled_date)}</p>
                    </div>
                    <span className="text-xs font-medium">{formatCurrency(job.price)}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Recent Invoices</h2>
            <Link to="/invoices" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {recentInvoices.length === 0 ? (
            <EmptyState icon={FileText} title="No invoices yet" subtitle="Create an invoice to track payments" />
          ) : (
            <div className="space-y-2">
              {recentInvoices.map((inv) => {
                const cfg = PAYMENT_CONFIG[inv.payment_method] || PAYMENT_CONFIG.none;
                return (
                  <Link key={inv.id} to="/invoices" className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors">
                    <div className={`w-2 h-2 rounded-full ${inv.status === "paid" ? "bg-emerald-400" : "bg-amber-400"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{inv.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{inv.status === "paid" ? `${cfg.label} · ${formatDate(inv.paid_date)}` : `Due ${formatDate(inv.due_date)}`}</p>
                    </div>
                    <span className="text-xs font-medium">{formatCurrency(inv.amount)}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold flex items-center gap-2 mb-4"><AlertTriangle className="w-4 h-4 text-amber-400" /> Alerts</h2>
          <div className="space-y-2">
            {overdueInvoices.length > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-sm">{overdueInvoices.length} overdue invoice{overdueInvoices.length > 1 ? "s" : ""} need attention</p>
                <Link to="/invoices" className="ml-auto text-xs text-primary hover:underline">View</Link>
              </div>
            )}
            {todayJobs.length > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <CalIcon className="w-4 h-4 text-primary shrink-0" />
                <p className="text-sm">{todayJobs.length} job{todayJobs.length > 1 ? "s" : ""} scheduled for today</p>
                <Link to="/jobs" className="ml-auto text-xs text-primary hover:underline">View</Link>
              </div>
            )}
            {overdueInvoices.length === 0 && todayJobs.length === 0 && (
              <EmptyState icon={Sun} title="All clear!" subtitle="No alerts right now" />
            )}
          </div>
        </div>
      </div>

      {quickAddOpen && <QuickAddDialog type={quickAddOpen} onClose={() => setQuickAddOpen(false)} />}
    </div>
  );
}