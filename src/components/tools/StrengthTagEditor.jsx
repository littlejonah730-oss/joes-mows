import { useState } from "react";
import { useEntityCollection } from "@/hooks/useEntityCollection";
import { ROLE_CONFIG } from "@/lib/lawnCare";
import { Plus, X, Tag, Save } from "lucide-react";

const SUGGESTED_TAGS = [
  "Fast mower", "Cleanup beast", "Great with customers", "Precise edger",
  "Heavy-duty helper", "Detail oriented", "Speed demon", "Reliable",
  "Good with hills", "Equipment savvy", "Team leader", "Efficient loader"
];

export default function StrengthTagEditor({ employees = [] }) {
  const { updateItem } = useEntityCollection("Employee");
  const [selectedEmpId, setSelectedEmpId] = useState(employees[0]?.id || "");
  const [customTag, setCustomTag] = useState("");

  const selectedEmp = employees.find((e) => e.id === selectedEmpId);
  const tags = selectedEmp?.strength_tags
    ? selectedEmp.strength_tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  function addTag(tag) {
    if (!selectedEmp || tags.includes(tag)) return;
    const newTags = [...tags, tag].join(", ");
    updateItem({ id: selectedEmp.id, strength_tags: newTags });
  }

  function removeTag(tag) {
    if (!selectedEmp) return;
    const newTags = tags.filter((t) => t !== tag).join(", ");
    updateItem({ id: selectedEmp.id, strength_tags: newTags });
  }

  function addCustomTag(e) {
    e.preventDefault();
    if (!customTag.trim()) return;
    addTag(customTag.trim());
    setCustomTag("");
  }

  return (
    <div>
      <div className="mb-4">
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Select Employee</label>
        <select value={selectedEmpId} onChange={(e) => setSelectedEmpId(e.target.value)} className="w-full max-w-sm h-9 px-3 rounded-md border border-input bg-transparent text-sm">
          {employees.map((emp) => {
            const role = ROLE_CONFIG[emp.role] || ROLE_CONFIG.greenhorn;
            return (<option key={emp.id} value={emp.id}>{emp.name} — {role.label}</option>);
          })}
        </select>
      </div>

      {selectedEmp && (
        <div className="space-y-4">
          {/* Current tags */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" /> Current Strength Tags
            </p>
            {tags.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tags yet. Add some below.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-red-400">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Add custom tag */}
          <form onSubmit={addCustomTag} className="flex gap-2">
            <input
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              placeholder="Add custom tag..."
              className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            />
            <button type="submit" className="px-3 h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add
            </button>
          </form>

          {/* Suggested tags */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Suggested Tags</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_TAGS.filter((t) => !tags.includes(t)).map((tag) => (
                <button
                  key={tag}
                  onClick={() => addTag(tag)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors border border-border"
                >
                  <Plus className="w-3 h-3" /> {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}