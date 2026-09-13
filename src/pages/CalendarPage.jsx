import { useState, useEffect } from "react";
import { useEntityCollection } from "@/hooks/useEntityCollection";
import { base44 } from "@/api/base44Client";
import { PageHeader, LoadingState, EmptyState, Badge } from "@/components/ui/shared";
import { Button } from "@/components/ui/button";
import { STATUS_CONFIG, formatCurrency, formatTime, isToday } from "@/lib/lawnCare";
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Clock, Pencil, Trash2, Plus, GripVertical } from "lucide-react";
import CalendarEditDialog from "@/components/CalendarEditDialog";
import AddressLink from "@/components/AddressLink";
import { notifyScheduleChange } from "@/lib/scheduleChangeNotify";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Calendar() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [dragJob, setDragJob] = useState(null);
  const [dragOverDate, setDragOverDate] = useState(null);
  const { data: customers = [] } = useEntityCollection("Customer");
  const { data: employees = [] } = useEntityCollection("Employee");

  useEffect(() => {
    load();
    const unsubscribe = base44.entities.Job.subscribe(() => load());
    return unsubscribe;
  }, []);

  async function load() {
    try {
      const data = await base44.entities.Job.list("-scheduled_date", 500);
      setJobs(data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function saveJob(data) {
    const oldDate = editingJob?.id ? String(editingJob.scheduled_date || "").slice(0, 10) : null;
    const newDate = data.scheduled_date ? String(data.scheduled_date).slice(0, 10) : null;
    try {
      if (editingJob?.id) await base44.entities.Job.update(editingJob.id, data);
      else await base44.entities.Job.create(data);
      if (editingJob?.id && oldDate && newDate && oldDate !== newDate) {
        notifyScheduleChange({ job_id: editingJob.id, customer_name: data.customer_name || editingJob.customer_name, old_date: oldDate, new_date: newDate, action: "moved" });
      }
    } catch (e) { console.error(e); }
    setEditingJob(null);
  }
  async function deleteJob(job) {
    try {
      await base44.entities.Job.delete(job.id);
      notifyScheduleChange({ job_id: job.id, customer_name: job.customer_name, old_date: String(job.scheduled_date || "").slice(0, 10), action: "cancelled" });
    } catch (e) { console.error(e); }
    setEditingJob(null);
  }
  async function rescheduleJob(job, newDate) {
    const newDateStr = newDate.toISOString().slice(0, 10);
    try {
      await base44.entities.Job.update(job.id, { scheduled_date: newDateStr });
      notifyScheduleChange({ job_id: job.id, customer_name: job.customer_name, old_date: String(job.scheduled_date || "").slice(0, 10), new_date: newDateStr, action: "moved" });
    } catch (e) { console.error(e); }
    setDragJob(null);
    setDragOverDate(null);
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const jobsByDate = {};
  jobs.forEach((j) => {
    const key = (typeof j.scheduled_date === 'string' && j.scheduled_date.length === 10 ? new Date(j.scheduled_date + 'T00:00:00') : new Date(j.scheduled_date)).toDateString();
    if (!jobsByDate[key]) jobsByDate[key] = [];
    jobsByDate[key].push(j);
  });

  function prevMonth() { setCurrentDate(new Date(year, month - 1, 1)); }
  function nextMonth() { setCurrentDate(new Date(year, month + 1, 1)); }

  const selectedJobs = selectedDate ? (jobsByDate[selectedDate.toDateString()] || []) : [];

  if (loading) return <LoadingState />;

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(new Date(year, month, d));

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle="Visual schedule of all jobs"
        action={
          <Button variant={editMode ? "default" : "outline"} className={editMode ? "bg-primary text-black" : ""} onClick={() => setEditMode((m) => !m)}>
            <Pencil className="w-4 h-4 mr-2" /> {editMode ? "Done" : "Edit Mode"}
          </Button>
        }
      />
      {editMode && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 mb-4 text-sm">
          <span className="text-primary font-semibold">Edit Mode:</span> <span className="text-muted-foreground">Drag a job chip on the calendar (or in the day list) onto another day to reschedule. Tap a job to edit or delete.</span>
        </div>
      )}

      {(() => {
        const ref = selectedDate || new Date();
        const weekStart = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - ref.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        const weekJobs = jobs.filter((j) => {
          if (j.status === "cancelled") return false;
          const d = new Date((typeof j.scheduled_date === "string" && j.scheduled_date.length === 10 ? j.scheduled_date : j.scheduled_date?.slice(0, 10)) + "T00:00:00");
          return d >= weekStart && d < weekEnd;
        });
        const weekTotal = weekJobs.reduce((s, j) => s + (j.price || 0), 0);
        const weekEndLabel = new Date(weekEnd - 1);
        return (
          <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4 mb-4 flex items-center justify-between gap-3 neon-border">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Week of {weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {weekEndLabel.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{weekJobs.length} job{weekJobs.length === 1 ? "" : "s"} scheduled</p>
            </div>
            <p className="text-2xl font-bold text-primary neon-text shrink-0">{formatCurrency(weekTotal)}</p>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">{MONTHS[month]} {year}</h2>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()); }}>Today</Button>
              <Button size="sm" variant="ghost" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-2">{d}</div>
            ))}
            {calendarDays.map((date, idx) => {
              if (!date) return <div key={idx} />;
              const dayJobs = jobsByDate[date.toDateString()] || [];
              const isTodayDate = isToday(date);
              const isSelected = selectedDate?.toDateString() === date.toDateString();
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(date)}
                  onDragOver={(e) => { if (editMode && dragJob) { e.preventDefault(); setDragOverDate(date); } }}
                  onDragLeave={() => setDragOverDate((d) => (d && d.toDateString() === date.toDateString() ? null : d))}
                  onDrop={(e) => { if (editMode && dragJob) { e.preventDefault(); rescheduleJob(dragJob, date); } }}
                  className={`relative min-h-[64px] p-1.5 rounded-lg border text-left transition-all ${
                    dragOverDate && dragOverDate.toDateString() === date.toDateString() ? "border-primary neon-border bg-primary/10" :
                    isSelected ? "border-primary neon-border bg-primary/5" : "border-transparent hover:border-border hover:bg-muted/40"
                  }`}
                >
                  <span className={`text-xs font-medium ${isTodayDate ? "text-primary" : ""}`}>{date.getDate()}</span>
                  <div className="mt-1 space-y-0.5">
                    {dayJobs.slice(0, editMode ? 4 : 3).map((j) => {
                      const cfg = STATUS_CONFIG[j.status] || STATUS_CONFIG.scheduled;
                      if (editMode) {
                        return (
                          <div
                            key={j.id}
                            draggable
                            onDragStart={() => setDragJob(j)}
                            onDragEnd={() => { setDragJob(null); setDragOverDate(null); }}
                            onClick={(e) => { e.stopPropagation(); setEditingJob(j); }}
                            title={`${j.customer_name} — ${cfg.label}`}
                            className="flex items-center gap-1 rounded bg-card/90 border border-border px-1 py-0.5 cursor-grab active:cursor-grabbing"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
                            <span className="text-[9px] font-medium truncate">{j.customer_name}</span>
                          </div>
                        );
                      }
                      return <div key={j.id} className="h-1.5 rounded-full" style={{ backgroundColor: cfg.hex }} />;
                    })}
                    {!editMode && dayJobs.length > 3 && <p className="text-[9px] text-muted-foreground">+{dayJobs.length - 3} more</p>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Day Details */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3 gap-2">
            <h2 className="font-semibold flex items-center gap-2">
              <CalIcon className="w-4 h-4 text-primary" />
              {selectedDate ? selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }) : "Select a day"}
            </h2>
          </div>
          {!selectedDate ? (
            <EmptyState icon={CalIcon} title="No day selected" subtitle="Tap a date to see jobs" />
          ) : selectedJobs.length === 0 ? (
            <EmptyState icon={CalIcon} title="No jobs" subtitle="No jobs scheduled for this day" />
          ) : (
            <div className="space-y-2">
              {selectedJobs.map((job) => {
                const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.scheduled;
                return (
                  <div
                    key={job.id}
                    draggable={editMode}
                    onDragStart={() => editMode && setDragJob(job)}
                    onDragEnd={() => { setDragJob(null); setDragOverDate(null); }}
                    className={`p-3 rounded-lg border transition-all ${editMode ? "border-primary/40 cursor-grab active:cursor-grabbing" : "border-border hover:border-primary/30"}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {editMode && <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                      <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      <Badge color={cfg.color} bg={cfg.bg}>{cfg.label}</Badge>
                      {editMode && (
                        <div className="ml-auto flex gap-1">
                          <button onClick={() => setEditingJob(job)} className="p-1 rounded hover:bg-muted text-primary"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => { if (confirm(`Delete job for ${job.customer_name}?`)) deleteJob(job); }} className="p-1 rounded hover:bg-muted text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-medium">{job.customer_name}</p>
                    {job.customer_address && <p className="text-[11px] text-muted-foreground mt-0.5"><AddressLink address={job.customer_address} /></p>}
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {formatTime(job.scheduled_date)}</p>
                      <span className="text-sm font-medium">{formatCurrency(job.price)}</span>
                    </div>
                    {job.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{job.notes}"</p>}
                  </div>
                );
              })}
            </div>
          )}
          {selectedDate && editMode && (
            <Button variant="outline" className="w-full mt-3" onClick={() => setEditingJob({ scheduled_date: selectedDate.toISOString().slice(0, 10) })}>
              <Plus className="w-4 h-4 mr-2" /> Add Job to This Day
            </Button>
          )}
        </div>
      </div>

      {editingJob && (
        <CalendarEditDialog
          job={editingJob}
          customers={customers}
          employees={employees}
          onSave={saveJob}
          onDelete={deleteJob}
          onClose={() => setEditingJob(null)}
        />
      )}
    </div>
  );
}