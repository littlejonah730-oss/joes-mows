import { useState } from "react";
import { useEntityCollection } from "@/hooks/useEntityCollection";
import { Megaphone, Send, Trash2 } from "lucide-react";

export default function QuickAnnounce({ employees = [] }) {
  const { data: announcements = [], createItem, deleteItem } = useEntityCollection("Announcement", { sort: "-created_date" });
  const [target, setTarget] = useState("all");
  const [content, setContent] = useState("");
  const [sent, setSent] = useState(false);

  function targetLabel(a) {
    if (a.target_type === "all") return "All";
    return employees.find((e) => e.id === a.target_employee_id)?.name || "Individual";
  }

  function send() {
    if (!content.trim()) return;
    createItem({
      title: content.trim().slice(0, 60),
      content: content.trim(),
      target_type: target === "all" ? "all" : "individual",
      target_employee_id: target === "all" ? "" : target,
      target_role: "",
    });
    setContent("");
    setTarget("all");
    setSent(true);
    setTimeout(() => setSent(false), 2000);
  }

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3 mb-5">
      <div className="flex items-center gap-2 mb-2">
        <Megaphone className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold">Quick Announce</p>
        <span className="text-[10px] text-muted-foreground">— posts to the employee portal instantly</span>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <select value={target} onChange={(e) => setTarget(e.target.value)} className="px-3 h-10 rounded-lg border border-border bg-card text-sm sm:w-44">
          <option value="all">All Employees</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder="Type an announcement..."
          className="flex-1 h-10 px-3 rounded-lg border border-border bg-card text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <button
          onClick={send}
          disabled={!content.trim()}
          className="px-4 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5 hover:bg-primary/90 transition-colors"
        >
          <Send className="w-4 h-4" /> {sent ? "Sent!" : "Send"}
        </button>
      </div>

      {announcements.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {announcements.slice(0, 5).map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-2 rounded-lg border border-border bg-card/60 px-2.5 py-1.5">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{a.content}</p>
                <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">{targetLabel(a)}</span>
              </div>
              <button onClick={() => deleteItem(a.id)} className="p-1 rounded hover:bg-muted shrink-0">
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}