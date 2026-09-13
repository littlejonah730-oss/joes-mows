import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Leaf, ClipboardList } from "lucide-react";
import { isToday, formatCurrency } from "@/lib/lawnCare";

export default function ClockSlide({ settings, jobs }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const todayJobs = jobs.filter((j) => isToday(j.scheduled_date) && ["scheduled", "in_progress"].includes(j.status));
  const todayTotal = todayJobs.reduce((s, j) => s + (j.price || 0), 0);
  const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const date = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center neon-glow shrink-0">
          {settings?.logo_url ? <img src={settings.logo_url} alt="logo" className="w-full h-full object-cover rounded-2xl" /> : <Leaf className="w-7 h-7 text-black" />}
        </div>
        <span className="text-2xl lg:text-3xl font-bold neon-text">{settings?.business_name || "GreenPro Lawn Care"}</span>
      </motion.div>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-muted-foreground text-lg lg:text-xl mb-2">{date}</motion.p>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.6 }} className="text-7xl lg:text-9xl font-bold tracking-tight tabular-nums neon-text">{time}</motion.div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-10 flex items-center gap-6">
        <div className="flex items-center gap-2 text-lg lg:text-xl"><ClipboardList className="w-6 h-6 text-primary" /><span className="font-semibold">{todayJobs.length} jobs today</span></div>
        <div className="w-px h-8 bg-border" />
        <div className="text-lg lg:text-xl font-semibold text-primary">{formatCurrency(todayTotal)}</div>
      </motion.div>
    </div>
  );
}