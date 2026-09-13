import { useState } from "react";
import { useEntityCollection } from "@/hooks/useEntityCollection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import ResponsiveSelect from "@/components/ResponsiveSelect";
import { ROLE_CONFIG } from "@/lib/lawnCare";
import { Megaphone, Trash2, Plus } from "lucide-react";

export default function AnnouncementSection({ employees }) {
  const { data: announcements = [], createItem, deleteItem } = useEntityCollection("Announcement", { sort: "-created_date" });
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetType, setTargetType] = useState("all");
  const [targetRole, setTargetRole] = useState("greenhorn");
  const [targetEmpId, setTargetEmpId] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    createItem({
      title: title.trim(),
      content: content.trim(),
      target_type: targetType,
      target_role: targetType === "role" ? targetRole : "",
      target_employee_id: targetType === "individual" ? targetEmpId : "",
    });
    setTitle("");
    setContent("");
    setTargetType("all");
    setShowForm(false);
  }

  function targetLabel(a) {
    if (a.target_type === "all") return "All";
    if (a.target_type === "role") return ROLE_CONFIG[a.target_role]?.label || a.target_role;
    if (a.target_type === "individual") return employees.find((e) => e.id === a.target_employee_id)?.name || "Individual";
    return "";
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-primary" />
          Announcements
        </h2>
        <Button size="sm" variant="ghost" onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-1" /> New</Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3 mb-4 p-3 rounded-lg bg-muted/30">
          <div>
            <Label className="text-xs mb-1.5 block">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title" required />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Content</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={2} placeholder="Message to employees..." required />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Target</Label>
            <ResponsiveSelect
              value={targetType}
              onValueChange={setTargetType}
              options={[
                { value: "all", label: "All Employees" },
                { value: "role", label: "Specific Role" },
                { value: "individual", label: "Individual" },
              ]}
            />
          </div>
          {targetType === "role" && (
            <ResponsiveSelect
              value={targetRole}
              onValueChange={setTargetRole}
              options={Object.entries(ROLE_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))}
            />
          )}
          {targetType === "individual" && (
            <ResponsiveSelect
              value={targetEmpId}
              onValueChange={setTargetEmpId}
              placeholder="Select employee"
              options={employees.map((e) => ({ value: e.id, label: e.name }))}
            />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="bg-primary text-black hover:bg-primary/90">Post</Button>
          </div>
        </form>
      )}

      {announcements.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No announcements yet</p>
      ) : (
        <div className="space-y-2">
          {announcements.map((a) => (
            <div key={a.id} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{a.title}</p>
                    <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">{targetLabel(a)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{a.content}</p>
                </div>
                <button onClick={() => deleteItem(a.id)} className="p-1 rounded hover:bg-muted shrink-0">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}