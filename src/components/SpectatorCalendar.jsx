import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { LoadingState, EmptyState, Badge } from "@/components/ui/shared";
import { Button } from "@/components/ui/button";
import { STATUS_CONFIG, formatDate } from "@/lib/lawnCare";
import { ChevronLeft, ChevronRight, Calendar as CalIcon, ArrowLeft, UserCheck } from "lucide-react";
import PushEnableButton from "@/components/PushEnableButton";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SpectatorCalendar({ onBack }) {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const data = await base44.entities.Job.list("-scheduled_date", 500);
      setJobs(data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
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
  const today = new Date();

  if (loading) return <LoadingState />;

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(new Date(year, month, d));

  return (
    <div className="min-h-screen bg-background p-4 safe-top-bottom">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Exit
          </button>
          <div className="flex-1" />
          <h1 className="text-lg font-bold flex items-center gap-2">
            <span className="text-2xl">🌿</span> Schedule
          </h1>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 mb-4 max-w-md">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Phone Alerts</p>
          <p className="text-[11px] text-muted-foreground mb-2">Get a push each morning with the day's schedule and when jobs change.</p>
          <PushEnableButton role="viewer" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
                const isTodayDate = date.toDateString() === today.toDateString();
                const isSelected = selectedDate?.toDateString() === date.toDateString();
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(date)}
                    className={`relative min-h-[60px] p-1.5 rounded-lg border text-left transition-all ${
                      isSelected ? "border-primary neon-border bg-primary/5" : "border-transparent hover:border-border hover:bg-muted"
                    }`}
                  >
                    <span className={`text-xs font-medium ${isTodayDate ? "text-primary" : ""}`}>{date.getDate()}</span>
                    {isTodayDate && !isSelected && <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary" />}
                    <div className="mt-1 space-y-0.5">
                      {dayJobs.slice(0, 3).map((j) => {
                        const cfg = STATUS_CONFIG[j.status] || STATUS_CONFIG.scheduled;
                        return <div key={j.id} className="h-1.5 rounded-full" style={{ backgroundColor: cfg.hex }} />;
                      })}
                      {dayJobs.length > 3 && <p className="text-[9px] text-muted-foreground">+{dayJobs.length - 3} more</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <CalIcon className="w-4 h-4 text-primary" />
              {selectedDate ? selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }) : "Select a day"}
            </h2>
            {!selectedDate ? (
              <EmptyState icon={CalIcon} title="No day selected" subtitle="Tap a date to see jobs" />
            ) : selectedJobs.length === 0 ? (
              <EmptyState icon={CalIcon} title="No jobs" subtitle="No jobs scheduled for this day" />
            ) : (
              <div className="space-y-2">
                {selectedJobs.map((job) => {
                  const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.scheduled;
                  return (
                    <div key={job.id} className="p-3 rounded-lg border border-border hover:border-primary/30 transition-all">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                        <Badge color={cfg.color} bg={cfg.bg}>{cfg.label}</Badge>
                      </div>
                      <p className="text-sm font-medium">{job.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{job.job_type}</p>
                      {job.claimed_by_name && (
                        <p className="text-xs text-primary flex items-center gap-1 mt-1"><UserCheck className="w-3 h-3" /> {job.claimed_by_name}</p>
                      )}
                      {job.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{job.notes}"</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}