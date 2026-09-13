import { useState } from "react";
import { useEntityCollection } from "@/hooks/useEntityCollection";
import { PageHeader, LoadingState, EmptyState, StatCard } from "@/components/ui/shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ExpenseForm from "@/components/ExpenseForm";
import MileageTracker from "@/components/MileageTracker";
import { formatCurrency, formatDate } from "@/lib/lawnCare";
import { Search, Plus, Receipt, TrendingDown, Edit, Trash2, DollarSign, Navigation, Check } from "lucide-react";
import CollapsibleSection from "@/components/CollapsibleSection";

const CATEGORY_CONFIG = {
  fuel: { label: "Fuel", icon: "⛽" },
  equipment: { label: "Equipment", icon: "🔧" },
  supplies: { label: "Supplies", icon: "📦" },
  labor: { label: "Labor", icon: "👷" },
  other: { label: "Other", icon: "📋" },
};

export default function Expenses() {
  const { data: expenses = [], isLoading, createItem, updateItem, deleteItem } = useEntityCollection("Expense");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editExpense, setEditExpense] = useState(null);

  const filtered = expenses.filter((e) => {
    const matchSearch = !search || e.description?.toLowerCase().includes(search.toLowerCase()) || e.vendor?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "all" || e.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const paidExpenses = expenses.filter((e) => e.paid !== false);
  const unpaidExpenses = expenses.filter((e) => e.paid === false);
  const totalExpenses = paidExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const pendingTotal = unpaidExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const now = new Date();
  const monthExpenses = paidExpenses.filter((e) => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, e) => s + (e.amount || 0), 0);

  const categoryBreakdown = Object.keys(CATEGORY_CONFIG).map((cat) => {
    const catExpenses = paidExpenses.filter((e) => e.category === cat);
    return { category: cat, total: catExpenses.reduce((s, e) => s + (e.amount || 0), 0), count: catExpenses.length };
  }).filter((c) => c.count > 0);

  if (isLoading) return <LoadingState />;

  const handleSave = (data) => {
    if (editExpense) {
      updateItem({ id: editExpense.id, ...data });
    } else {
      createItem(data);
    }
    setShowForm(false);
  };

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle={pendingTotal > 0 ? `${expenses.length} total · ${unpaidExpenses.length} pending (${formatCurrency(pendingTotal)})` : `${expenses.length} total expenses`}
        action={<Button onClick={() => { setEditExpense(null); setShowForm(true); }} className="bg-primary text-black hover:bg-primary/90"><Plus className="w-4 h-4 mr-2" /> Add Expense</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard icon={DollarSign} label="Total Expenses" value={formatCurrency(totalExpenses)} accent="bg-red-500/10" />
        <StatCard icon={TrendingDown} label="This Month" value={formatCurrency(monthExpenses)} accent="bg-amber-500/10" />
        <StatCard icon={Receipt} label="Categories" value={categoryBreakdown.length} accent="bg-primary/10" />
      </div>

      <CollapsibleSection title="Mileage Tracker" icon={Navigation} className="mb-6">
        <MileageTracker />
      </CollapsibleSection>

      {categoryBreakdown.length > 0 && (
        <CollapsibleSection title="Category Breakdown" icon={Receipt} className="mb-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {categoryBreakdown.map((cb) => {
              const cfg = CATEGORY_CONFIG[cb.category];
              const pct = totalExpenses > 0 ? (cb.total / totalExpenses) * 100 : 0;
              return (
                <div key={cb.category} className="rounded-xl border border-border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{cfg.icon}</span>
                    <span className="text-xs font-medium">{cfg.label}</span>
                  </div>
                  <p className="text-lg font-bold">{formatCurrency(cb.total)}</p>
                  <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{cb.count} expenses</p>
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search expenses..." className="pl-9" />
        </div>
        <div className="flex gap-1 p-1 rounded-lg border border-border overflow-x-auto">
          <button onClick={() => setCategoryFilter("all")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${categoryFilter === "all" ? "bg-primary text-black" : "text-muted-foreground hover:text-foreground"}`}>
            All
          </button>
          {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
            <button key={k} onClick={() => setCategoryFilter(k)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${categoryFilter === k ? "bg-primary text-black" : "text-muted-foreground hover:text-foreground"}`}>
              {v.icon} {v.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Receipt} title="No expenses found" subtitle="Track your business expenses to see net profit"
          action={<Button onClick={() => setShowForm(true)} className="bg-primary text-black hover:bg-primary/90"><Plus className="w-4 h-4 mr-2" /> Add Expense</Button>} />
      ) : (
        <div className="space-y-2">
          {filtered.map((exp) => {
          const cfg = CATEGORY_CONFIG[exp.category] || CATEGORY_CONFIG.other;
          const unpaid = exp.paid === false;
          return (
            <div key={exp.id} className={`rounded-xl border bg-card p-4 transition-all ${unpaid ? "border-amber-500/40 bg-amber-500/5" : "border-border hover:border-primary/30"}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${unpaid ? "bg-amber-500/10" : "bg-muted"}`}>{cfg.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{exp.description || cfg.label}</p>
                    {unpaid && <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded">UNPAID</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{cfg.label} · {exp.vendor || "Unknown vendor"} · {formatDate(exp.date)}</p>
                </div>
                <p className={`font-bold ${unpaid ? "text-amber-400" : "text-red-400"}`}>-{formatCurrency(exp.amount)}</p>
                <div className="flex gap-1">
                  {unpaid && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-400 hover:bg-emerald-500/10" onClick={() => updateItem({ id: exp.id, paid: true })}>
                      <Check className="w-3 h-3 mr-1" /> Mark Paid
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditExpense(exp); setShowForm(true); }}><Edit className="w-3 h-3" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400" onClick={() => { if (confirm("Delete this expense?")) deleteItem(exp.id); }}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            </div>
          );
          })}
        </div>
      )}

      {showForm && (
        <Dialog open onOpenChange={(o) => !o && setShowForm(false)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editExpense ? "Edit Expense" : "Add Expense"}</DialogTitle></DialogHeader>
            <ExpenseForm expense={editExpense} onSubmit={handleSave} onCancel={() => setShowForm(false)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}