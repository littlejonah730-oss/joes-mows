import { useState } from "react";
import { useEntityCollection } from "@/hooks/useEntityCollection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/shared";
import { formatDateShort } from "@/lib/lawnCare";
import { Route, Plus, Trash2, Gauge } from "lucide-react";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function MileageTracker() {
  const { data: mileage = [], createItem, deleteItem } = useEntityCollection("Mileage", { sort: "-date" });
  const [date, setDate] = useState(todayStr());
  const [miles, setMiles] = useState("");
  const [note, setNote] = useState("");

  const totalMiles = mileage.reduce((s, m) => s + (m.miles || 0), 0);

  function handleAdd(e) {
    e.preventDefault();
    const parsed = parseFloat(miles);
    if (!date || isNaN(parsed) || parsed <= 0) return;
    createItem({ date, miles: parsed, note: note.trim() || undefined });
    setMiles("");
    setNote("");
    setDate(todayStr());
  }

  return (
    <div className="space-y-4 mb-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Gauge} label="Total Miles (All Time)" value={totalMiles.toLocaleString(undefined, { maximumFractionDigits: 1 })} sublabel={`${mileage.length} entries`} accent="bg-blue-500/10" />
        <StatCard icon={Route} label="Today's Miles" value={(mileage.filter((m) => m.date === todayStr()).reduce((s, m) => s + (m.miles || 0), 0)).toLocaleString(undefined, { maximumFractionDigits: 1 })} sublabel="Driven today" accent="bg-primary/10" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 lg:p-5">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><Route className="w-4 h-4 text-primary" /> Log Miles</h2>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="sm:w-44" />
          <Input type="number" step="0.1" min="0" value={miles} onChange={(e) => setMiles(e.target.value)} placeholder="Miles driven" className="sm:w-36" />
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="flex-1" />
          <Button type="submit" className="bg-primary text-black hover:bg-primary/90 whitespace-nowrap">
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </form>

        {mileage.length > 0 && (
          <div className="mt-4 space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recent Entries</p>
            {mileage.slice(0, 8).map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-sm font-medium w-24 shrink-0">{formatDateShort(m.date)}</span>
                <span className="text-sm font-bold text-blue-400 w-20 shrink-0">{(m.miles || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} mi</span>
                <span className="text-xs text-muted-foreground flex-1 truncate">{m.note || "—"}</span>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400" onClick={() => deleteItem(m.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}