import { motion } from "framer-motion";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { DollarSign, Clock, TrendingDown, Landmark } from "lucide-react";
import { formatCurrency, STATUS_CONFIG } from "@/lib/lawnCare";

export default function StatsSlide({ invoices, expenses, jobs, customers }) {
  const now = new Date();

  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const ms = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const me = new Date(now.getFullYear(), now.getMonth() - 5 + i + 1, 0);
    const rev = invoices
      .filter((inv) => { const d = new Date(inv.paid_date || inv.created_date); return d >= ms && d <= me && inv.status === "paid"; })
      .reduce((s, inv) => s + (inv.amount || 0), 0);
    const exp = expenses
      .filter((e) => { const d = new Date(e.date); return d >= ms && d <= me; })
      .reduce((s, e) => s + (e.amount || 0), 0);
    return { month: ms.toLocaleDateString("en-US", { month: "short" }), revenue: Math.round(rev), expenses: Math.round(exp) };
  });

  const paid = invoices.filter((i) => i.status === "paid");
  const unpaid = invoices.filter((i) => i.status === "unpaid");
  const revenue = paid.reduce((s, i) => s + (i.amount || 0), 0);
  const outstanding = unpaid.reduce((s, i) => s + (i.amount || 0), 0);
  const totalExp = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const net = revenue - totalExp;

  const statusData = Object.entries(STATUS_CONFIG)
    .map(([key, cfg]) => ({ name: cfg.label, value: jobs.filter((j) => j.status === key).length, color: cfg.hex }))
    .filter((d) => d.value > 0);

  const cards = [
    { icon: DollarSign, label: "Revenue", value: formatCurrency(revenue), color: "text-emerald-400" },
    { icon: Clock, label: "Outstanding", value: formatCurrency(outstanding), color: "text-amber-400" },
    { icon: TrendingDown, label: "Expenses", value: formatCurrency(totalExp), color: "text-red-400" },
    { icon: Landmark, label: "Net Profit", value: formatCurrency(net), color: "text-primary" },
  ];

  return (
    <div className="flex flex-col h-full px-4 lg:px-8 py-4 overflow-hidden">
      <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-3xl lg:text-4xl font-bold mb-3 neon-text">Business Stats</motion.h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div key={c.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="rounded-xl border border-border bg-card/60 glass p-3">
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.3 }}>
                <Icon className={`w-6 h-6 mb-1.5 ${c.color}`} />
              </motion.div>
              <p className={`text-xl lg:text-2xl font-bold ${c.color}`}>{c.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{c.label}</p>
            </motion.div>
          );
        })}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 flex-1 min-h-0">
        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="rounded-xl border border-border bg-card/60 glass p-3 flex flex-col min-h-0">
          <p className="text-xs font-semibold mb-1.5">Revenue vs Expenses (6mo)</p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" />
                <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", fontSize: "11px" }} formatter={formatCurrency} />
                <Legend wrapperStyle={{ fontSize: "10px" }} />
                <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} animationDuration={1400} />
                <Bar dataKey="expenses" name="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} animationDuration={1400} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="rounded-xl border border-border bg-card/60 glass p-3 flex flex-col min-h-0">
          <p className="text-xs font-semibold mb-1.5">Job Status</p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={{ fontSize: 10 }} animationDuration={1400}>
                  {statusData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: "10px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}