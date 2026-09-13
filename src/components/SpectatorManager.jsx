import { useState } from "react";
import { useEntityCollection } from "@/hooks/useEntityCollection";
import CollapsibleSection from "@/components/CollapsibleSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Eye, EyeOff, KeyRound } from "lucide-react";

function generateCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export default function SpectatorManager() {
  const { data: spectators = [], createItem, deleteItem } = useEntityCollection("Spectator");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState(generateCode());
  const [visibleCodes, setVisibleCodes] = useState({});

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    createItem({ name: name.trim(), code });
    setName("");
    setCode(generateCode());
    setShowForm(false);
  }

  return (
    <CollapsibleSection title="Schedule Viewers" icon={KeyRound} badge={spectators.length} className="mb-6"
      action={<Button size="sm" variant="ghost" onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-1" /> Add</Button>}
    >
      {showForm && (
        <form onSubmit={handleSubmit} className="flex gap-2 mb-3 flex-wrap">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Viewer name" className="flex-1 min-w-[150px]" autoFocus />
          <div className="flex items-center gap-1">
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code" className="w-24" maxLength={6} />
            <button type="button" onClick={() => setCode(generateCode())} className="text-xs text-primary hover:text-primary/80 px-1">↻</button>
          </div>
          <Button type="submit" size="sm" className="bg-primary text-black hover:bg-primary/90">Save</Button>
        </form>
      )}
      {spectators.length === 0 ? (
        <p className="text-sm text-muted-foreground py-3 text-center">No schedule viewers yet. Add one to share your calendar.</p>
      ) : (
        <div className="space-y-2">
          {spectators.map((sp) => (
            <div key={sp.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">{sp.name?.charAt(0)?.toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{sp.name}</p>
                  <p className="text-xs text-muted-foreground">Code: {visibleCodes[sp.id] ? sp.code : "••••"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setVisibleCodes((p) => ({ ...p, [sp.id]: !p[sp.id] }))}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
                  {visibleCodes[sp.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => { if (confirm(`Remove ${sp.name}?`)) deleteItem(sp.id); }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-muted">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </CollapsibleSection>
  );
}