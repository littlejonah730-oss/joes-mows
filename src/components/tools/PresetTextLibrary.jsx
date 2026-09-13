import { useState } from "react";
import { useEntityCollection } from "@/hooks/useEntityCollection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { logInteraction } from "@/lib/interactionLog";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Copy, Edit, Trash2, Check, ClipboardList, User, Sparkles } from "lucide-react";

const CATEGORIES = [
  "Rescheduling", "On My Way", "Weather Delay", "Price Explanation",
  "Introductions", "Follow-Ups", "Gate Code Requests", "Completion Notices",
  "Late Notices", "Quote Messages", "Day Switch Notices"
];

function fillTemplate(content, name) {
  if (!content) return "";
  return content.replace(/\{name\}/gi, name || "[Name]");
}

export default function PresetTextLibrary({ customers = [] }) {
  const { data: presets = [], createItem, updateItem, deleteItem } = useEntityCollection("PresetText");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [copiedId, setCopiedId] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [customerId, setCustomerId] = useState(null);

  const handleSave = (data) => {
    if (editItem) updateItem({ id: editItem.id, ...data });
    else createItem(data);
    setShowForm(false);
    setEditItem(null);
  };

  function handleCustomerNameChange(value) {
    setCustomerName(value);
    const match = customers.find((c) => c.name.toLowerCase() === value.toLowerCase());
    setCustomerId(match ? match.id : null);
  }

  function handleCopy(preset) {
    const filled = fillTemplate(preset.content, customerName);
    navigator.clipboard.writeText(filled);
    if (customerId) {
      logInteraction({
        customer_id: customerId,
        customer_name: customerName,
        type: "preset_message",
        description: `[${preset.category}] ${preset.title}: ${filled}`,
      });
    }
    setCopiedId(preset.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const filtered = activeCategory === "All" ? presets : presets.filter((p) => p.category === activeCategory);

  return (
    <div>
      {/* Customer Name Selector */}
      <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-3">
        <Label className="text-xs mb-1.5 flex items-center gap-1.5"><User className="w-3 h-3" /> Customer Name (auto-inserts into messages)</Label>
        <Input
          list="preset-customer-names"
          value={customerName}
          onChange={(e) => handleCustomerNameChange(e.target.value)}
          placeholder="Type or select a customer name..."
          className="bg-background"
        />
        <datalist id="preset-customer-names">
          {customers.map((c) => (<option key={c.id} value={c.name} />))}
        </datalist>
        {customerName && (
          <p className="text-[10px] text-muted-foreground mt-1">Messages will use "{customerName}" — click copy to grab the filled text.</p>
        )}
      </div>

      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap max-w-[70%]">
          <button onClick={() => setActiveCategory("All")} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${activeCategory === "All" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>All</button>
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${activeCategory === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{cat}</button>
          ))}
        </div>
        <Button onClick={() => { setEditItem(null); setShowForm(true); }} size="sm" className="bg-primary text-black hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-1" /> New Preset
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ClipboardList className="w-10 h-10 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No preset messages yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((preset) => {
            const preview = fillTemplate(preset.content, customerName);
            return (
              <div key={preset.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{preset.title}</p>
                    <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">{preset.category}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleCopy(preset)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary" title="Copy with name">
                      {copiedId === preset.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => { setEditItem(preset); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteItem(preset.id)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-4 whitespace-pre-wrap">{preview}</p>
                {customerId && copiedId === preset.id && (
                  <p className="text-[9px] text-emerald-400 mt-1">✓ Logged to {customerName}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <Dialog open onOpenChange={(o) => !o && (setShowForm(false), setEditItem(null))}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editItem ? "Edit Preset" : "New Preset"}</DialogTitle></DialogHeader>
            <PresetForm preset={editItem} onSubmit={handleSave} onCancel={() => { setShowForm(false); setEditItem(null); }} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function PresetForm({ preset, onSubmit, onCancel }) {
  const { toast } = useToast();
  const [title, setTitle] = useState(preset?.title || "");
  const [content, setContent] = useState(preset?.content || "");
  const [category, setCategory] = useState(preset?.category || "Follow-Ups");
  const [aiPrompt, setAiPrompt] = useState("");
  const [generating, setGenerating] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    onSubmit({ title: title.trim(), content: content.trim(), category });
  };

  async function handleGenerate() {
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    try {
      const result = await base44.functions.invoke("generatePresetMessage", { prompt: aiPrompt });
      const data = result?.data || {};
      setContent(data.message);
      if (!title) setTitle(data.title);
      toast({ title: "Message generated!" });
    } catch (e) {
      toast({ title: "Generation failed", variant: "destructive" });
    }
    setGenerating(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label className="text-xs mb-1.5 block">Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Running 15 min late" autoFocus />
      </div>
      <div>
        <Label className="text-xs mb-1.5 block">Category</Label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm">
          {CATEGORIES.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
        </select>
      </div>
      <div>
        <Label className="text-xs mb-1.5 block">Message Content</Label>
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Type the preset message... Use {name} to auto-insert the customer's name." rows={4} />
        <p className="text-[10px] text-muted-foreground mt-1">Tip: Use {"{name}"} anywhere to auto-fill the customer's name when copying.</p>
      </div>
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
        <Label className="text-xs flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-primary" /> AI Preset Generator</Label>
        <Input value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Describe what you need... e.g., 'customer going on vacation for 2 weeks'" className="bg-background" />
        <Button type="button" variant="outline" size="sm" className="w-full" onClick={handleGenerate} disabled={generating || !aiPrompt.trim()}>
          {generating ? "Generating..." : "Generate Message"}
        </Button>
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="flex-1 bg-primary text-black hover:bg-primary/90">{preset ? "Update" : "Create"}</Button>
      </div>
    </form>
  );
}