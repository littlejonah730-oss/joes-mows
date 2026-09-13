import { motion } from "framer-motion";
import { Calendar, MapPin } from "lucide-react";
import { STATUS_CONFIG, formatCurrency, formatDateShort, isToday } from "@/lib/lawnCare";

function dateOf(d) { return typeof d === "string" && d.length === 10 ? new Date(d + "T00:00:00") : new Date(d); }
function isTomorrow(d) { const t = new Date(); t.setDate(t.getDate() + 1); return dateOf(d).toDateString() === t.toDateString(); }

export default function JobsSlide({ variant, jobs }) {
  let list;
  if (variant === "upcoming") {
    list = jobs
      .filter((j) => j.status === "scheduled" && dateOf(j.scheduled_date) > new Date())
      .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))
      .slice(0, 8);
  } else if (variant === "tomorrow") {
    list = jobs.filter((j) => isTomorrow(j.scheduled_date) && j.status === "scheduled");
  } else {
    list = jobs.filter((j) => isToday(j.scheduled_date) && ["scheduled", "in_progress"].includes(j.status));
  }
  const total = list.reduce((s, j) => s + (j.price || 0), 0);
  const titles = { today: "Today", tomorrow: "Tomorrow", upcoming: "Upcoming Jobs" };
  const empties = { today: "No jobs scheduled today", tomorrow: "Nothing scheduled tomorrow", upcoming: "No upcoming jobs" };

  return (
    <div className="flex flex-col h-full px-6 lg:px-16 py-8">
      <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} className="flex items-end justify-between mb-6">
        <div>
          <h2 className="text-4xl lg:text-6xl font-bold neon-text">{titles[variant]}</h2>
          <p className="text-muted-foreground text-lg mt-1">{list.length} job{list.length !== 1 ? "s" : ""} · {formatCurrency(total)}</p>
        </div>
        <Calendar className="w-10 h-10 text-primary/40" />
      </motion.div>
      <div className="flex-1 space-y-3 overflow-hidden">
        {list.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-2xl">{empties[variant]}</div>
        ) : (
          list.map((job, i) => {
            const sc = STATUS_CONFIG[job.status] || STATUS_CONFIG.scheduled;
            return (
              <motion.div key={job.id} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-card/60 glass">
                <div className={`w-3 h-3 rounded-full ${sc.dot} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xl lg:text-2xl font-semibold truncate">{job.customer_name}</p>
                  <p className="text-muted-foreground truncate flex items-center gap-1.5"><MapPin className="w-4 h-4 shrink-0" />{job.customer_address || job.job_type}</p>
                </div>
                {variant === "upcoming" && <span className="text-sm text-muted-foreground hidden sm:block shrink-0">{formatDateShort(job.scheduled_date)}</span>}
                <span className="text-xl lg:text-2xl font-bold text-primary shrink-0">{formatCurrency(job.price)}</span>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}