import { useState } from "react";
import { useEntityCollection } from "@/hooks/useEntityCollection";
import { formatCurrency } from "@/lib/lawnCare";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ListPlus, Trash2, CheckCircle2, Clock } from "lucide-react";

export default function WaitlistManager() {
  const { data: entries = [], createItem, deleteItem } = useEntityCollection("WaitlistEntry", { sort: "created_date", limit: 200 });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "", set_price: 0, notes: "" });

  const waiting = entries.filter((e) => e.status === "waiting");
  const filled = entries.filter((e) => e.status === "filled").slice(-3).reverse();

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  function addEntry(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    createItem({ ...form, set_price: Number(form.set_price) || 0, status: "waiting" });
    setForm({ name: "", phone: "", address: "", set_price: 0, notes: "" });
    setShowForm(false);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 mb-4">
      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
        <div className="flex items-center gap-2">
          <ListPlus className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">
            Waitlist
            {waiting.length > 0 && (
              <span className="ml-2 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {waiting.length} waiting
              </span>
            )}
          </h3>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Close" : "Add to Waitlist"}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">
        When a scheduled job gets cancelled, the next person in line is auto-booked into the open slot.
      </p>

      {showForm && (
        <form onSubmit={addEntry} className="grid grid-cols-2 gap-2 mb-3 p-3 rounded-xl bg-muted/30">
          <div className="col-span-2 sm:col-span-1">
            <Label className="text-[11px]">Name *</Label>
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Jane Smith" required />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Label className="text-[11px]">Phone</Label>
            <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="(555) 123-4567" />
          </div>
          <div className="col-span-2">
            <Label className="text-[11px]">Address</Label>
            <Input value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="123 Main St, San Angelo, TX" />
          </div>
          <div>
            <Label className="text-[11px]">Quoted Price ($)</Label>
            <Input type="number" step="0.01" value={form.set_price} onChange={(e) => update("set_price", parseFloat(e.target.value) || 0)} />
          </div>
          <div className="col-span-2">
            <Label className="text-[11px]">Notes</Label>
            <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={2} placeholder="Evening availability, specific requests…" />
          </div>
          <div className="col-span-2 flex justify-end">
            <Button type="submit" size="sm" className="h-8 text-xs bg-primary text-black hover:bg-primary/90">Add to Waitlist</Button>
          </div>
        </form>
      )}

      {waiting.length === 0 && filled.length === 0 ? (
        <p className="text-xs text-muted-foreground py-1">No one on the waitlist yet.</p>
      ) : (
        <div className="space-y-1.5">
          {waiting.map((e, idx) => (
            <div key={e.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
              <span className="text-[10px] font-bold text-primary bg-primary/10 w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate">
                  {e.name} {e.set_price > 0 && <span className="text-primary">· {formatCurrency(e.set_price)}</span>}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {e.notes || e.address || e.phone || "Waiting"}
                </p>
              </div>
              <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <button
                onClick={() => {
                  if (confirm(`Remove ${e.name} from the waitlist?`)) deleteItem(e.id);
                }}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-red-400 transition-colors shrink-0"
                aria-label="Remove"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {filled.map((e) => (
            <div key={e.id} className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <p className="text-xs text-muted-foreground truncate">
                <span className="font-semibold text-foreground">{e.name}</span> — auto-booked
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}