import { motion } from "framer-motion";
import { isToday, formatCurrency } from "@/lib/lawnCare";

function dateOf(d) { return typeof d === "string" && d.length === 10 ? new Date(d + "T00:00:00") : new Date(d); }

export default function WeekSlide({ jobs }) {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day));
  const days = Array.from({ length: 6 }, (_, i) => { const d = new Date(monday); d.setDate(d.getDate() + i); return d; });

  return (
    <div className="flex flex-col h-full px-6 lg:px-12 py-8">
      <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl lg:text-5xl font-bold mb-6 neon-text">This Week</motion.h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 flex-1">
        {days.map((d, i) => {
          const dayJobs = jobs.filter((j) => dateOf(j.scheduled_date).toDateString() === d.toDateString() && j.status !== "cancelled");
          const total = dayJobs.reduce((s, j) => s + (j.price || 0), 0);
          const active = isToday(d);
          return (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07 }} className={`rounded-2xl border p-3 lg:p-4 flex flex-col ${active ? "border-primary bg-primary/10 neon-glow" : "border-border bg-card/60 glass"}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold text-lg lg:text-xl">{d.toLocaleDateString("en-US", { weekday: "short" })}</p>
                <p className={`text-sm ${active ? "text-primary font-bold" : "text-muted-foreground"}`}>{d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{dayJobs.length} job{dayJobs.length !== 1 ? "s" : ""} · {formatCurrency(total)}</p>
              <div className="space-y-1 overflow-hidden flex-1">
                {dayJobs.slice(0, 4).map((j) => (
                  <p key={j.id} className="text-sm truncate"><span className="text-primary">•</span> {j.customer_name}</p>
                ))}
                {dayJobs.length > 4 && <p className="text-xs text-muted-foreground">+{dayJobs.length - 4} more</p>}
                {dayJobs.length === 0 && <p className="text-xs text-muted-foreground/50 italic">Open</p>}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}