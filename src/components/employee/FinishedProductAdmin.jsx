import { useState } from "react";
import { useEntityCollection } from "@/hooks/useEntityCollection";
import { Image } from "@/components/ui/image";
import { formatDateShort } from "@/lib/lawnCare";
import { Camera, Trash2, Images } from "lucide-react";

export default function FinishedProductAdmin({ employees }) {
  const { data: photos = [], deleteItem } = useEntityCollection("JobPhoto", { sort: "-created_date" });
  const [empFilter, setEmpFilter] = useState("all");

  const filtered = empFilter === "all" ? photos : photos.filter((p) => p.employee_id === empFilter);

  const groups = [...new Set(filtered.map((p) => p.scheduled_date).filter(Boolean))]
    .sort((a, b) => b.localeCompare(a))
    .map((date) => ({ date, items: filtered.filter((p) => p.scheduled_date === date) }));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h2 className="font-semibold flex items-center gap-2">
            <Camera className="w-4 h-4 text-primary" /> Finished Product Photos
          </h2>
          <select
            value={empFilter}
            onChange={(e) => setEmpFilter(e.target.value)}
            className="h-9 px-3 rounded-md border border-input bg-transparent text-sm"
          >
            <option value="all">All employees</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Photos employees upload from the Finished tab in their portal.
        </p>

        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Images className="w-10 h-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No photos yet.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map((g) => (
              <div key={g.date}>
                <p className="text-xs font-bold text-primary uppercase tracking-wide mb-2">
                  {formatDateShort(g.date)}
                </p>
                <div className="space-y-3">
                  {g.items.map((p) => (
                    <div key={p.id} className="flex gap-3 rounded-xl border border-border p-2">
                      <Image src={p.image_url} className="w-24 h-24 rounded-lg shrink-0" fittingType="fill" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{p.customer_name}</p>
                        <p className="text-xs text-muted-foreground">by {p.employee_name || "—"}</p>
                        {p.caption && <p className="text-xs text-muted-foreground mt-1">{p.caption}</p>}
                      </div>
                      <button
                        onClick={() => deleteItem(p.id)}
                        className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}