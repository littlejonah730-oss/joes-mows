import { useState } from "react";
import { useEntityCollection } from "@/hooks/useEntityCollection";
import { PageHeader, LoadingState, EmptyState, Badge, StatCard } from "@/components/ui/shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import InvoiceForm from "@/components/InvoiceForm";
import CollapsibleSection from "@/components/CollapsibleSection";
import { PAYMENT_CONFIG, formatCurrency, formatDate, formatDateShort, isOverdue } from "@/lib/lawnCare";
import { Search, Plus, FileText, DollarSign, Clock, TrendingUp, Edit, Trash2, Check, Calendar } from "lucide-react";

export default function Invoices() {
  const { data: invoices = [], isLoading, createItem, updateItem, deleteItem } = useEntityCollection("Invoice");
  const { data: customers = [] } = useEntityCollection("Customer");
  const { data: jobs = [] } = useEntityCollection("Job", { sort: "-scheduled_date" });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [showForm, setShowForm] = useState(false);
  const [editInvoice, setEditInvoice] = useState(null);

  const filtered = invoices.filter((inv) => {
    const matchSearch = !search || inv.customer_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || (statusFilter === "overdue" ? isOverdue(inv) : inv.status === statusFilter);
    return matchSearch && matchStatus;
  }).sort((a, b) => {
    const da = new Date((a.paid_date || a.due_date || a.created_date) + ((a.paid_date || a.due_date)?.length === 10 ? "T00:00:00" : ""));
    const db = new Date((b.paid_date || b.due_date || b.created_date) + ((b.paid_date || b.due_date)?.length === 10 ? "T00:00:00" : ""));
    return sortOrder === "newest" ? db - da : da - db;
  });

  const groupedInvoices = [];
  let lastDate = null;
  filtered.forEach((inv) => {
    const dateKey = inv.paid_date || inv.due_date;
    if (dateKey !== lastDate) {
      groupedInvoices.push({ type: "header", date: dateKey });
      lastDate = dateKey;
    }
    groupedInvoices.push({ type: "invoice", inv });
  });

  const totalRevenue = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + (i.amount || 0), 0);
  const totalOutstanding = invoices.filter((i) => i.status === "unpaid").reduce((s, i) => s + (i.amount || 0), 0);
  const overdueCount = invoices.filter(isOverdue).length;
  const paymentBreakdown = ["cash", "venmo", "cashapp", "check"].map((method) => {
    const methodInvoices = invoices.filter((i) => i.status === "paid" && i.payment_method === method);
    const total = methodInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);
    return { method, total, count: methodInvoices.length };
  });

  function markPaid(inv) {
    const method = prompt("Payment method? (cash, venmo, cashapp, check)", "cash");
    if (!method) return;
    updateItem({
      id: inv.id,
      status: "paid",
      payment_method: method.toLowerCase(),
      paid_date: new Date().toISOString().slice(0, 10),
    });
  }

  if (isLoading) return <LoadingState />;

  const handleSave = (data) => {
    if (editInvoice) {
      updateItem({ id: editInvoice.id, ...data });
    } else {
      createItem(data);
    }
    setShowForm(false);
  };

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle={`${invoices.length} total invoices`}
        action={<Button onClick={() => { setEditInvoice(null); setShowForm(true); }} className="bg-primary text-black hover:bg-primary/90"><Plus className="w-4 h-4 mr-2" /> Create Invoice</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard icon={DollarSign} label="Total Revenue" value={formatCurrency(totalRevenue)} accent="bg-emerald-500/10" />
        <StatCard icon={Clock} label="Outstanding" value={formatCurrency(totalOutstanding)} sublabel={`${overdueCount} overdue`} accent="bg-amber-500/10" />
        <StatCard icon={TrendingUp} label="Avg Invoice" value={formatCurrency(invoices.length ? invoices.reduce((s, i) => s + (i.amount || 0), 0) / invoices.length : 0)} accent="bg-primary/10" />
      </div>

      <CollapsibleSection title="Payment Method Breakdown" icon={DollarSign} className="mb-6" action={<span className="text-xs text-muted-foreground">{formatCurrency(totalRevenue)} total</span>}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {paymentBreakdown.map((pb) => {
            const cfg = PAYMENT_CONFIG[pb.method];
            const pct = totalRevenue > 0 ? (pb.total / totalRevenue) * 100 : 0;
            return (
              <div key={pb.method} className="rounded-xl border border-border p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{cfg.icon}</span>
                  <span className="text-xs font-medium">{cfg.label}</span>
                </div>
                <p className="text-lg font-bold">{formatCurrency(pb.total)}</p>
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{pb.count} payments</p>
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoices..." className="pl-9" />
        </div>
        <div className="flex gap-1 p-1 rounded-lg border border-border">
          {["all", "unpaid", "paid", "overdue"].map((f) => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${statusFilter === f ? "bg-primary text-black" : "text-muted-foreground hover:text-foreground"}`}>
              {f}
            </button>
          ))}
        </div>
        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-card text-sm">
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No invoices found" subtitle="Create an invoice to track payments"
          action={<Button onClick={() => setShowForm(true)} className="bg-primary text-black hover:bg-primary/90"><Plus className="w-4 h-4 mr-2" /> Create Invoice</Button>} />
      ) : (
        <div className="space-y-1">
          {groupedInvoices.map((item) => {
            if (item.type === "header") {
              return (
                <div key={`header-${item.date}`} className="flex items-center gap-2 pt-4 pb-1 px-1">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wide">{formatDateShort(item.date)}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              );
            }
            const inv = item.inv;
            const cfg = PAYMENT_CONFIG[inv.payment_method] || PAYMENT_CONFIG.none;
            const overdue = isOverdue(inv);
            return (
              <div key={inv.id} className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-lg shrink-0">
                    {inv.status === "paid" ? cfg.icon : "📄"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{inv.customer_name}</p>
                      <Badge color={inv.status === "paid" ? "text-emerald-400" : overdue ? "text-red-400" : "text-amber-400"}
                             bg={inv.status === "paid" ? "bg-emerald-500/10" : overdue ? "bg-red-500/10" : "bg-amber-500/10"}>
                        {inv.status === "paid" ? "Paid" : overdue ? "Overdue" : "Unpaid"}
                      </Badge>
                      {inv.status === "paid" && inv.payment_method !== "none" && (
                        <span className="text-xs text-muted-foreground">{cfg.label}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {inv.description || "Service invoice"} · {inv.status === "paid" ? `Paid ${formatDate(inv.paid_date)}` : `Due ${formatDate(inv.due_date)}`}
                    </p>
                    {inv.notes && <p className="text-xs text-muted-foreground/70 mt-1 italic">"{inv.notes}"</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold">{formatCurrency(inv.amount)}</p>
                    <div className="flex gap-1 mt-1 justify-end">
                      {inv.status === "unpaid" && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-400" onClick={() => markPaid(inv)}>
                          <Check className="w-3 h-3 mr-1" /> Mark Paid
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditInvoice(inv); setShowForm(true); }}>
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400" onClick={() => { if (confirm("Delete this invoice?")) deleteItem(inv.id); }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
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
            <DialogHeader><DialogTitle>{editInvoice ? "Edit Invoice" : "Create Invoice"}</DialogTitle></DialogHeader>
            <InvoiceForm invoice={editInvoice} customers={customers} jobs={jobs} onSubmit={handleSave} onCancel={() => setShowForm(false)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}