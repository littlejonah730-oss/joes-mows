import { motion } from "framer-motion";
import { DollarSign, Clock, TrendingDown, Landmark } from "lucide-react";
import { formatCurrency, PAYMENT_CONFIG } from "@/lib/lawnCare";

export default function MoneySlide({ invoices, expenses }) {
  const paid = invoices.filter((i) => i.status === "paid");
  const unpaid = invoices.filter((i) => i.status === "unpaid");
  const revenue = paid.reduce((s, i) => s + (i.amount || 0), 0);
  const outstanding = unpaid.reduce((s, i) => s + (i.amount || 0), 0);
  const totalExp = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const net = revenue - totalExp;

  const cards = [
    { icon: DollarSign, label: "Total Revenue", value: formatCurrency(revenue), color: "text-emerald-400" },
    { icon: Clock, label: "Outstanding", value: formatCurrency(outstanding), color: "text-amber-400" },
    { icon: TrendingDown, label: "Expenses", value: formatCurrency(totalExp), color: "text-red-400" },
    { icon: Landmark, label: "Net Profit", value: formatCurrency(net), color: "text-primary" },
  ];
  const methods = ["cash", "venmo", "cashapp", "check"].map((m) => ({ m, total: paid.filter((i) => i.payment_method === m).reduce((s, i) => s + (i.amount || 0), 0) }));

  return (
    <div className="flex flex-col h-full px-6 lg:px-16 py-8">
      <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl lg:text-5xl font-bold mb-6 neon-text">Money</motion.h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div key={c.label} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="rounded-2xl border border-border bg-card/60 glass p-4 lg:p-6">
              <Icon className={`w-8 h-8 mb-3 ${c.color}`} />
              <p className={`text-3xl lg:text-4xl font-bold ${c.color}`}>{c.value}</p>
              <p className="text-muted-foreground text-sm mt-1">{c.label}</p>
            </motion.div>
          );
        })}
      </div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="rounded-2xl border border-border bg-card/60 glass p-5 flex-1">
        <p className="font-semibold mb-3">Payment Methods</p>
        <div className="space-y-3">
          {methods.map((m) => {
            const cfg = PAYMENT_CONFIG[m.m];
            const pct = revenue > 0 ? (m.total / revenue) * 100 : 0;
            return (
              <div key={m.m} className="flex items-center gap-3">
                <span className="text-xl w-6 text-center">{cfg.icon}</span>
                <span className="text-sm w-16 lg:w-20">{cfg.label}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${pct}%` }} /></div>
                <span className="text-sm font-semibold w-24 text-right">{formatCurrency(m.total)}</span>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}