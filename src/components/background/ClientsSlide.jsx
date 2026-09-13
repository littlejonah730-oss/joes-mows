import { motion } from "framer-motion";
import { Users, UserCheck, Repeat } from "lucide-react";
import { formatCurrency } from "@/lib/lawnCare";

export default function ClientsSlide({ customers, jobs }) {
  const active = customers.filter((c) => c.active);
  const recurring = customers.filter((c) => c.is_recurring);
  const counts = new Map();
  jobs.forEach((j) => { if (j.customer_id) counts.set(j.customer_id, (counts.get(j.customer_id) || 0) + 1); });
  const top = [...customers].map((c) => ({ c, count: counts.get(c.id) || 0 })).sort((a, b) => b.count - a.count).slice(0, 5);

  const cards = [
    { icon: Users, label: "Total Customers", value: customers.length },
    { icon: UserCheck, label: "Active", value: active.length },
    { icon: Repeat, label: "Recurring", value: recurring.length },
  ];

  return (
    <div className="flex flex-col h-full px-6 lg:px-16 py-8">
      <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl lg:text-5xl font-bold mb-6 neon-text">Clients</motion.h2>
      <div className="grid grid-cols-3 gap-3 lg:gap-4 mb-6">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div key={c.label} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }} className="rounded-2xl border border-border bg-card/60 glass p-4 lg:p-6 text-center">
              <Icon className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-4xl lg:text-5xl font-bold">{c.value}</p>
              <p className="text-muted-foreground text-xs lg:text-sm mt-1">{c.label}</p>
            </motion.div>
          );
        })}
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-2xl border border-border bg-card/60 glass p-5 flex-1">
        <p className="font-semibold mb-3">Top Clients by Jobs</p>
        <div className="space-y-2.5">
          {top.map((t, i) => (
            <div key={t.c.id} className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold shrink-0">{i + 1}</span>
              <span className="flex-1 font-medium truncate">{t.c.name}</span>
              <span className="text-muted-foreground text-sm shrink-0">{t.count} jobs</span>
              <span className="text-primary font-semibold w-20 text-right">{formatCurrency(t.c.set_price)}</span>
            </div>
          ))}
          {top.length === 0 && <p className="text-muted-foreground text-center py-4">No customers yet</p>}
        </div>
      </motion.div>
    </div>
  );
}