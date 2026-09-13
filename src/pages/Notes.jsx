import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { PageHeader, LoadingState, EmptyState } from "@/components/ui/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/lawnCare";
import { StickyNote, Plus, Trash2, Search } from "lucide-react";

const DEFAULT_CATEGORIES = ["General", "Customer", "Job", "Invoice", "Schedule", "Route"];

const CATEGORY_COLORS = [
  { color: "text-amber-400", bg: "bg-amber-500/10" },
  { color: "text-blue-400", bg: "bg-blue-500/10" },
  { color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { color: "text-purple-400", bg: "bg-purple-500/10" },
  { color: "text-sky-400", bg: "bg-sky-500/10" },
  { color: "text-pink-400", bg: "bg-pink-500/10" },
  { color: "text-teal-400", bg: "bg-teal-500/10" },
];

function getCatStyle(category) {
  const idx = DEFAULT_CATEGORIES.indexOf(category);
  if (idx >= 0) return CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
  let hash = 0;
  for (let i = 0; i < (category || "").length; i++) hash = ((hash << 5) - hash + (category || "").charCodeAt(i)) | 0;
  return CATEGORY_COLORS[Math.abs(hash) % CATEGORY_COLORS.length];
}

export default function Notes() {
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [editNote, setEditNote] = useState(null);
  const [form, setForm] = useState({ title: "", content: "", category: "General" });

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const data = await base44.entities.Note.list("-created_date", 500);
      setNotes(data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function saveNote(e) {
    e?.preventDefault();
    if (!form.content.trim()) return;
    if (editNote?.id) {
      await base44.entities.Note.update(editNote.id, { title: form.title, content: form.content, category: form.category || "General" });
    } else {
      await base44.entities.Note.create({ title: form.title, content: form.content, category: form.category || "General" });
    }
    setForm({ title: "", content: "", category: "General" });
    setEditNote(null);
    load();
  }

  function openNew() {
    setForm({ title: "", content: "", category: filter !== "all" ? filter : "General" });
    setEditNote({});
  }

  function openEdit(note) {
    setForm({ title: note.title || "", content: note.content || "", category: note.category || "General" });
    setEditNote(note);
  }

  const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...notes.map((n) => n.category).filter(Boolean)])];

  const filtered = notes.filter((n) => {
    const matchSearch = !search || n.title?.toLowerCase().includes(search.toLowerCase()) || n.content?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || n.category === filter;
    return matchSearch && matchFilter;
  });

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Notes"
        subtitle={`${notes.length} notes`}
        action={<Button onClick={openNew} className="bg-primary text-black hover:bg-primary/90"><Plus className="w-4 h-4 mr-2" /> New Note</Button>}
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes..." className="pl-9" />
        </div>
      </div>

      <div className="flex gap-1.5 mb-4 flex-wrap">
        <button onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === "all" ? "bg-primary text-black" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
          All
        </button>
        {allCategories.map((cat) => (
          <button key={cat} onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === cat ? "bg-primary text-black" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={StickyNote} title="No notes found" subtitle="Create your first note"
          action={<Button onClick={openNew} className="bg-primary text-black hover:bg-primary/90"><Plus className="w-4 h-4 mr-2" /> New Note</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((note) => {
            const style = getCatStyle(note.category);
            return (
              <div key={note.id} className="group rounded-xl border border-border bg-amber-500/5 p-4 hover:border-primary/30 transition-all relative cursor-pointer" onClick={() => openEdit(note)}>
                <div className="flex items-start justify-between mb-2 gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${style.color} ${style.bg}`}>{note.category || "General"}</span>
                  <button onClick={async (e) => { e.stopPropagation(); await base44.entities.Note.delete(note.id); load(); }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {note.title && <p className="font-semibold text-sm mb-1">{note.title}</p>}
                <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-5">{note.content}</p>
                <p className="text-[10px] text-muted-foreground/50 mt-2">{formatDateTime(note.created_date)}</p>
              </div>
            );
          })}
        </div>
      )}

      {editNote && (
        <Dialog open onOpenChange={(o) => !o && (setEditNote(null), setForm({ title: "", content: "", category: "General" }))}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editNote.id ? "Edit Note" : "New Note"}</DialogTitle></DialogHeader>
            <form onSubmit={saveNote} className="space-y-3">
              <div>
                <Label className="text-xs mb-1.5 block">Title</Label>
                <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Note title" autoFocus />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Category</Label>
                <Input value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} placeholder="Type a category..." list="note-categories" />
                <datalist id="note-categories">
                  {allCategories.map((cat) => <option key={cat} value={cat} />)}
                </datalist>
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Content</Label>
                <Textarea value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} rows={6} placeholder="Write your note..." className="resize-none" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => { setEditNote(null); setForm({ title: "", content: "", category: "General" }); }}>Cancel</Button>
                <Button type="submit" className="bg-primary text-black hover:bg-primary/90">Save</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}