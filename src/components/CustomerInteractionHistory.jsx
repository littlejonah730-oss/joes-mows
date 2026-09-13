import { useEntityCollection } from "@/hooks/useEntityCollection";
import { MessageSquare, StickyNote, CalendarClock, FileText, Clock } from "lucide-react";

const TYPE_CONFIG = {
  preset_message: { label: "Preset Message", icon: MessageSquare, color: "text-blue-400", bg: "bg-blue-500/10" },
  note: { label: "Note Added", icon: StickyNote, color: "text-purple-400", bg: "bg-purple-500/10" },
  schedule_change: { label: "Schedule Change", icon: CalendarClock, color: "text-amber-400", bg: "bg-amber-500/10" },
  invoice: { label: "Invoice", icon: FileText, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  other: { label: "Other", icon: Clock, color: "text-muted-foreground", bg: "bg-muted" },
};

export default function CustomerInteractionHistory({ customerId }) {
  const { data: interactions = [] } = useEntityCollection("CustomerInteraction");

  const customerInteractions = interactions
    .filter((i) => i.customer_id === customerId)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  return (
    <div className="rounded-2xl border border-border bg-card p-5 mb-4">
      <h2 className="font-semibold mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4 text-primary" /> Interaction History
      </h2>
      {customerInteractions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No interactions logged yet.</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
          {customerInteractions.map((item) => {
            const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.other;
            const Icon = cfg.icon;
            return (
              <div key={item.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
                  <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                    {item.actor_name && <span className="text-[10px] text-muted-foreground">by {item.actor_name}</span>}
                  </div>
                  <p className="text-xs mt-0.5">{item.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(item.created_date).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}