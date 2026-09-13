import { useState, useEffect, useRef } from "react";
import { useEntityCollection } from "@/hooks/useEntityCollection";
import { PageHeader, LoadingState, EmptyState, Badge } from "@/components/ui/shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import JobForm from "@/components/JobForm";
import { STATUS_CONFIG, ASSIGNMENT_CONFIG, formatCurrency, formatDate, formatDateShort, formatDayOfWeek, getJobTimeFrame, getNextRecurringDate, PROMOTION_PATH, PROMOTION_THRESHOLDS, getJobEmployeePay } from "@/lib/lawnCare";
import { planDayRoute, formatJobTime } from "@/lib/travelTime";
import { getBaseJobMinutes } from "@/lib/baseJobEstimates";
import { runJobCompletion, maybeRequestGoogleReview } from "@/lib/jobCompletion";
import AddressLink from "@/components/AddressLink";
import { useAuth } from "@/lib/AuthContext";
import { Search, Plus, ClipboardList, ChevronDown, Edit, Trash2, Calendar, Star, UserCheck, Clock } from "lucide-react";

const STATUS_FILTERS = ["all", "scheduled", "in_progress", "completed", "paused", "cancelled"];

export default function Jobs() {
  const { user } = useAuth();
  const { data: jobs = [], isLoading, createItem, updateItem, deleteItem } = useEntityCollection("Job", { sort: "-scheduled_date" });
  const { data: customers = [] } = useEntityCollection("Customer");
  const { data: employees = [], updateItem: updateEmployee } = useEntityCollection("Employee");
  const { createItem: createInvoice } = useEntityCollection("Invoice");
  const { createItem: createExpense } = useEntityCollection("Expense");
  const { data: settingsList = [] } = useEntityCollection("BusinessSettings");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [showForm, setShowForm] = useState(false);
  const [editJob, setEditJob] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [manualTimes, setManualTimes] = useState({});

  function updateJobStatus(job, status) {
    if (status === "cancelled") {
      updateItem({ id: job.id, status, price: 0 });
      return;
    }
    if (status === "in_progress") {
      updateItem({ id: job.id, status, timer_started_at: new Date().toISOString(), started_by_name: user?.full_name || "You" });
      return;
    }
    if (status === "paused") {
      updateItem({ id: job.id, status });
      return;
    }
    if (status === "completed") {
      runJobCompletion(job, {
        employees,
        jobs,
        updateJob: updateItem,
        createInvoice,
        createExpense,
        updateEmployee,
        createNextJob: createItem,
      });
      // One-time customer → auto review-request text (owner's phone)
      maybeRequestGoogleReview(job, customers.find((c) => c.id === job.customer_id), settingsList[0]);
    }
  }

  const filtered = jobs.filter((j) => {
    const matchSearch = !search || j.customer_name?.toLowerCase().includes(search.toLowerCase()) || j.job_type?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || j.status === statusFilter;
    const tf = getJobTimeFrame(j.scheduled_date);
    const matchTime = timeFilter === "all" || tf === timeFilter;
    return matchSearch && matchStatus && matchTime;
  }).sort((a, b) => {
    const da = new Date(a.scheduled_date + (a.scheduled_date?.length === 10 ? "T00:00:00" : ""));
    const db = new Date(b.scheduled_date + (b.scheduled_date?.length === 10 ? "T00:00:00" : ""));
    return sortOrder === "newest" ? db - da : da - db;
  });

  const getWeekStart = (dateStr) => {
    const d = new Date(dateStr + (dateStr?.length === 10 ? "T00:00:00" : ""));
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().slice(0, 10);
  };

  const weeks = [];
  let currentWeekKey = null;
  filtered.forEach((job) => {
    const weekStart = getWeekStart(job.scheduled_date);
    if (weekStart !== currentWeekKey) {
      weeks.push({ weekStart, days: [], total: 0 });
      currentWeekKey = weekStart;
    }
    const week = weeks[weeks.length - 1];
    const dayKey = job.scheduled_date;
    let dayGroup = week.days.find((d) => d.date === dayKey);
    if (!dayGroup) {
      dayGroup = { date: dayKey, jobs: [], total: 0 };
      week.days.push(dayGroup);
    }
    dayGroup.jobs.push(job);
    if (job.status !== "cancelled") {
      dayGroup.total += job.price || 0;
      week.total += job.price || 0;
    }
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRef = useRef(null);
  useEffect(() => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [statusFilter, timeFilter, weeks.length]);

  const avgJobByCustomer = {};
  jobs.filter((j) => j.status === "completed" && (j.timer_duration_seconds || 0) > 0).forEach((j) => {
    if (!avgJobByCustomer[j.customer_id]) avgJobByCustomer[j.customer_id] = { sum: 0, count: 0 };
    avgJobByCustomer[j.customer_id].sum += j.timer_duration_seconds;
    avgJobByCustomer[j.customer_id].count += 1;
  });
  function getAvgJobSeconds(customerId) {
    const a = avgJobByCustomer[customerId];
    return a ? Math.round(a.sum / a.count) : 0;
  }

  // Manual base estimates (minutes) used until a job's time is recorded and no history exists.
  function getBaseJobSeconds(name) { return getBaseJobMinutes(name) * 60; }
  function getEstJobSeconds(job) {
    const avg = getAvgJobSeconds(job.customer_id);
    return avg > 0 ? avg : getBaseJobSeconds(job.customer_name);
  }

  if (isLoading) return <LoadingState />;

  const handleSave = (data) => {
    if (editJob) {
      updateItem({ id: editJob.id, ...data });
    } else {
      createItem(data);
    }
    setShowForm(false);
  };

  return (
    <div>
      <PageHeader
        title="Jobs"
        subtitle={`${jobs.length} total jobs`}
        action={<Button onClick={() => { setEditJob(null); setShowForm(true); }} className="bg-primary text-black hover:bg-primary/90"><Plus className="w-4 h-4 mr-2" /> Add Job</Button>}
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search jobs..." className="pl-9" />
        </div>
        <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-card text-sm">
          <option value="all">All Time</option>
          <option value="past">Past</option>
          <option value="present">Today</option>
          <option value="future">Future</option>
        </select>
        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-card text-sm">
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      <div className="flex gap-1 mb-4 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${statusFilter === s ? "bg-primary text-black" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No jobs found" subtitle="Schedule your first job"
          action={<Button onClick={() => setShowForm(true)} className="bg-primary text-black hover:bg-primary/90"><Plus className="w-4 h-4 mr-2" /> Add Job</Button>} />
      ) : (
        <div className="space-y-1">
          {weeks.map((week) => (
            <div key={`week-${week.weekStart}`} className="mb-4">
              <div className="flex items-center gap-2 mb-2 px-1 bg-muted/40 rounded-lg py-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-primary uppercase tracking-wide">Week of {formatDateShort(week.weekStart)}</span>
                <div className="flex-1 h-px bg-border" />
                <span className="text-sm font-bold text-primary">{formatCurrency(week.total)}</span>
              </div>
              {week.days.map((day) => {
                const dayOwed = day.jobs.filter((j) => j.claimed_by_employee_id && j.status !== "cancelled").reduce((s, j) => s + getJobEmployeePay(j), 0);
                const isToday = day.date === todayStr;
                const activeJobs = day.jobs.filter((j) => j.status !== "cancelled");
                const cancelledJobs = day.jobs.filter((j) => j.status === "cancelled");
                const dayRoute = planDayRoute(activeJobs);
                const orderedJobs = [...dayRoute, ...cancelledJobs];
                const jobTimeMin = Math.round(dayRoute.reduce((s, j) => {
                  const a = j.timer_duration_seconds || 0;
                  return s + (a > 0 ? a : getEstJobSeconds(j));
                }, 0) / 60);
                return (
                <div key={`day-${day.date}`} className={`mb-2 ${isToday ? "ring-1 ring-primary rounded-lg p-2 -m-2 bg-primary/5" : ""}`} ref={isToday ? todayRef : null} id={`day-${day.date}`}>
                  <div className="flex items-center gap-2 pt-2 pb-1 px-1">
                    <Calendar className="w-3.5 h-3.5 text-primary/70" />
                    <span className="text-xs font-semibold text-primary uppercase tracking-wide">{formatDateShort(day.date)}{isToday && <span className="ml-1 text-primary">· TODAY</span>}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">{formatDayOfWeek(day.date)}</span>
                    <div className="flex-1 h-px bg-border" />
                    {dayOwed > 0 && <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">Owe crew {formatCurrency(dayOwed)}</span>}
                    {jobTimeMin > 0 && <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded flex items-center gap-1"><Clock className="w-2.5 h-2.5" />Jobs {jobTimeMin}m</span>}
                    <span className="text-xs font-semibold text-muted-foreground">{formatCurrency(day.total)}</span>
                  </div>
                  {orderedJobs.map((job) => {
            const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.scheduled;
            const tf = getJobTimeFrame(job.scheduled_date);
            const isExpanded = expanded[job.id];
            const jobSec = job.timer_duration_seconds || 0;
            const estSec = getEstJobSeconds(job);
            const jobMins = jobSec > 0 ? formatJobTime(jobSec) : (estSec > 0 ? `~${formatJobTime(estSec)}` : "");
            return (
              <div key={job.id} className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-all">
                <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setExpanded((p) => ({ ...p, [job.id]: !p[job.id] }))}>
                  <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{job.customer_name}</p>
                      <Badge color={cfg.color} bg={cfg.bg}>{cfg.label}</Badge>
                      {job.claimed_by_name && <span className="text-[10px] text-primary flex items-center gap-0.5"><UserCheck className="w-3 h-3" />{job.claimed_by_name}</span>}
                      {job.exclusive_to_employee_name && <span className="text-[10px] text-primary font-bold bg-primary/15 px-1.5 py-0.5 rounded">🔒 {job.exclusive_to_employee_name}</span>}
                      {tf === "past" && <span className="text-[10px] text-muted-foreground">Past</span>}
                      {tf === "present" && <span className="text-[10px] text-primary font-medium">TODAY</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{job.job_type} · {formatDate(job.scheduled_date)}</p>
                    {jobMins && (
                      <p className="text-[11px] text-muted-foreground/80 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="text-primary flex items-center gap-0.5"><Clock className="w-3 h-3" />{jobMins}</span>
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{formatCurrency(job.price)}</p>
                    {job.is_recurring && <p className="text-[10px] text-primary">Recurring</p>}
                  </div>
                  {job.needs_help && (
                    <span className="text-[10px] text-orange-400 font-bold bg-orange-500/15 px-1.5 py-0.5 rounded">NEEDS HELP</span>
                  )}
                  {job.highlighted && (
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${ASSIGNMENT_CONFIG[job.employee_assignment]?.bg || "bg-muted"} ${ASSIGNMENT_CONFIG[job.employee_assignment]?.color || "text-muted-foreground"}`}>
                      {ASSIGNMENT_CONFIG[job.employee_assignment]?.label?.toUpperCase() || "HELP"}
                    </span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); updateItem({ id: job.id, highlighted: !job.highlighted }); }}
                    className={`p-1 rounded-lg transition-colors ${job.highlighted ? "text-amber-400" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Star className={`w-4 h-4 ${job.highlighted ? "fill-current" : ""}`} />
                  </button>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </div>
                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-border space-y-3">
                    {job.timer_started_at && !job.timer_duration_seconds && (
                      <p className="text-xs text-amber-400 pt-2 flex items-center gap-1">⏱ Timer running since {new Date(job.timer_started_at).toLocaleTimeString()}</p>
                    )}
                    {job.timer_duration_seconds > 0 && (
                      <p className="text-xs text-primary pt-2 flex items-center gap-1">⏱ Duration: {Math.floor(job.timer_duration_seconds / 60)}m {job.timer_duration_seconds % 60}s</p>
                    )}
                    <div className="flex items-center gap-2 pt-2">
                      <span className="text-xs text-muted-foreground">Set time manually:</span>
                      <input
                        type="number"
                        value={manualTimes[job.id] || ""}
                        onChange={(e) => setManualTimes((p) => ({ ...p, [job.id]: e.target.value }))}
                        placeholder="min"
                        className="w-16 h-7 px-2 rounded-md border border-input bg-transparent text-xs"
                      />
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                        const mins = parseInt(manualTimes[job.id]);
                        if (mins > 0) {
                          updateItem({ id: job.id, timer_duration_seconds: mins * 60, timer_started_at: null });
                        }
                      }}>
                        Save Time
                      </Button>
                    </div>
                    {job.notes && <p className="text-sm text-muted-foreground pt-2">{job.notes}</p>}
                    {job.customer_address && <p className="text-xs text-muted-foreground pt-1"><AddressLink address={job.customer_address} /></p>}
                    {job.pause_reason && <p className="text-xs text-amber-400">Reason: {job.pause_reason}</p>}
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <button
                        onClick={() => updateItem({ id: job.id, needs_help: !job.needs_help })}
                        className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${job.needs_help ? "bg-orange-500/20 text-orange-400" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                      >
                        {job.needs_help ? "Needs Help ✓" : "Mark Needs Help"}
                      </button>
                    </div>
                    {job.highlighted && (
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <span className="text-xs font-medium text-amber-400 flex items-center gap-1"><Star className="w-3 h-3 fill-current" /> Employee Visible</span>
                        <div className="flex gap-1">
                          {Object.entries(ASSIGNMENT_CONFIG).map(([key, cfg]) => (
                            <button
                              key={key}
                              onClick={() => updateItem({ id: job.id, employee_assignment: key })}
                              className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${job.employee_assignment === key ? `${cfg.bg} ${cfg.color}` : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
                            >
                              {cfg.label}
                            </button>
                          ))}
                        </div>
                        {job.claimed_by_name && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-primary flex items-center gap-1"><UserCheck className="w-3 h-3" /> {job.claimed_by_name}</span>
                            <button
                              onClick={() => updateItem({ id: job.id, claimed_by_employee_id: "", claimed_by_name: "", claimed_at: null })}
                              className="px-2 py-1 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {tf !== "past" && (
                      <div className="flex gap-1.5 flex-wrap pt-1">
                        {job.status !== "in_progress" && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => updateJobStatus(job, "in_progress")}>Start</Button>}
                        {job.status !== "completed" && <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-400" onClick={() => updateJobStatus(job, "completed")}>Complete</Button>}
                        {job.status !== "paused" && <Button size="sm" variant="ghost" className="h-7 text-xs text-purple-400" onClick={() => updateJobStatus(job, "paused")}>Pause</Button>}
                        {job.status !== "cancelled" && <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400" onClick={() => updateJobStatus(job, "cancelled")}>Cancel</Button>}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditJob(job); setShowForm(true); }}>
                        <Edit className="w-3 h-3 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400" onClick={() => { if (confirm("Delete this job?")) deleteItem(job.id); }}>
                        <Trash2 className="w-3 h-3 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
                </div>
              );})}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Dialog open onOpenChange={(o) => !o && setShowForm(false)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editJob ? "Edit Job" : "Add Job"}</DialogTitle></DialogHeader>
            <JobForm job={editJob} customers={customers} employees={employees} onSubmit={handleSave} onCancel={() => setShowForm(false)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}