import { motion } from "framer-motion";
import { Megaphone, Calendar, ClipboardList, DollarSign } from "lucide-react";
import { formatCurrency, isToday } from "@/lib/lawnCare";

function dateOf(d) { return typeof d === "string" && d.length === 10 ? new Date(d + "T00:00:00") : new Date(d); }

export default function BulletinSlide({ announcements, jobs, invoices }) {
  const todayJobs = jobs.filter((j) => isToday(j.scheduled_date) && ["scheduled", "in_progress"].includes(j.status));
  const ws = new Date(); ws.setDate(ws.getDate() - (ws.getDay() === 0 ? 6 : ws.getDay() - 1));
  const we = new Date(ws.getTime() + 7 * 86400000);
  const weekJobs = jobs.filter((j) => { const d = dateOf(j.scheduled_date); return d >= ws && d < we && j.status !== "cancelled"; });
  const revenue = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + (i.amount || 0), 0);
  const now = new Date();

  const stats = [
    { icon: Calendar, label: "Jobs This Week", value: weekJobs.length },
    { icon: ClipboardList, label: "Jobs Today", value: todayJobs.length },
    { icon: DollarSign, label: "Total Revenue", value: formatCurrency(revenue) },
  ];

  return (
    <div className="flex flex-col h-full px-6 lg:px-16 py-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h2 className="text-4xl lg:text-5xl font-bold neon-text">Weekly Bulletin</h2>
        <p className="text-muted-foreground text-lg mt-1">{now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
      </motion.div>
      <div className="grid grid-cols-3 gap-3 lg:gap-4 mb-5">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="rounded-2xl border border-border bg-card/60 glass p-4 text-center">
              <Icon className="w-7 h-7 mx-auto mb-2 text-primary" />
              <p className="text-2xl lg:text-3xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </motion.div>
          );
        })}
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-2xl border border-border bg-card/60 glass p-5 flex-1 overflow-hidden">
        <p className="font-semibold flex items-center gap-2 mb-3"><Megaphone className="w-5 h-5 text-primary" /> Announcements</p>
        {announcements.length === 0 ? (
          <div className="space-y-2">
            {todayJobs.slice(0, 5).map((j) => (
              <div key={j.id} className="flex items-center gap-3 py-1.5 border-b border-border/50">
                <span className="text-primary">•</span>
                <span className="flex-1 truncate">{j.customer_name} — {j.job_type}</span>
                <span className="text-primary font-semibold">{formatCurrency(j.price)}</span>
              </div>
            ))}
            {todayJobs.length === 0 && <p className="text-muted-foreground italic">All quiet on the lawn front. Enjoy the breather!</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.slice(0, 5).map((a) => (
              <div key={a.id} className="border-l-2 border-primary pl-3">
                <p className="font-semibold">{a.title}</p>
                <p className="text-muted-foreground text-sm">{a.content}</p>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}