import { useState } from "react";
import { useEntityCollection } from "@/hooks/useEntityCollection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Award, Trash2, Edit2, UserPlus } from "lucide-react";
import { CRITERIA_LABELS, COLOR_STYLES, getEmployeeBadgeStats, hasEmployeeEarnedBadge } from "@/lib/badgeUtils";

export default function BadgeManager({ employees, jobs }) {
  const { data: badges = [], createItem, updateItem, deleteItem } = useEntityCollection("Badge");
  const { data: assignments = [], createItem: createAssignment, deleteItem: deleteAssignment } = useEntityCollection("BadgeAssignment");
  const [showForm, setShowForm] = useState(false);
  const [editBadge, setEditBadge] = useState(null);
  const [showAssign, setShowAssign] = useState(false);
  const [assignEmpId, setAssignEmpId] = useState("");
  const [assignBadgeId, setAssignBadgeId] = useState("");

  function getEarners(badge) {
    return employees.filter(e => e.active !== false && hasEmployeeEarnedBadge(e.id, badge, jobs, employees));
  }

  function getManualEarners(badge) {
    return assignments.filter(a => a.badge_id === badge.id);
  }

  const handleSave = (data) => {
    if (editBadge) updateItem({ id: editBadge.id, ...data });
    else createItem(data);
    setShowForm(false);
    setEditBadge(null);
  };

  const handleAssign = (e) => {
    e.preventDefault();
    if (!assignEmpId || !assignBadgeId) return;
    const emp = employees.find(e => e.id === assignEmpId);
    const badge = badges.find(b => b.id === assignBadgeId);
    const exists = assignments.some(a => a.employee_id === assignEmpId && a.badge_id === assignBadgeId);
    if (!exists) {
      createAssignment({
        employee_id: assignEmpId,
        employee_name: emp?.name || "",
        badge_id: assignBadgeId,
        badge_name: badge?.name || ""
      });
    }
    setShowAssign(false);
    setAssignEmpId("");
    setAssignBadgeId("");
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Award className="w-4 h-4 text-primary" />
          Employee Badges
        </h2>
        <Button onClick={() => setShowAssign(true)} variant="outline" size="sm">
          <UserPlus className="w-3.5 h-3.5 mr-1" /> Award Manually
        </Button>
      </div>

      <div className="space-y-2 mb-3">
        {badges.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No badges yet. Create one to start rewarding your team!</p>
        ) : (
          badges.map(badge => {
            const earners = getEarners(badge);
            const manualEarners = getManualEarners(badge);
            return (
              <div key={badge.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-2xl shrink-0">{badge.icon || "🏆"}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{badge.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {badge.description || CRITERIA_LABELS[badge.criteria_type]} · {badge.criteria_threshold}+ · {earners.length + manualEarners.length} earned
                    </p>
                    {earners.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {earners.slice(0, 5).map(e => (
                          <span key={e.id} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary truncate max-w-[80px]">{e.name}</span>
                        ))}
                      </div>
                    )}
                    {manualEarners.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {manualEarners.map(a => (
                          <span key={a.id} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 flex items-center gap-1 truncate max-w-[120px]">
                            ★ {a.employee_name}
                            <button onClick={() => deleteAssignment(a.id)} className="text-purple-400/50 hover:text-purple-400">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setEditBadge(badge); setShowForm(true); }} className="p-1.5 rounded-md hover:bg-muted"><Edit2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  <button onClick={() => deleteItem(badge.id)} className="p-1.5 rounded-md hover:bg-muted"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                </div>
              </div>
            );
          })
        )}
      </div>
      <Button onClick={() => { setEditBadge(null); setShowForm(true); }} variant="outline" className="w-full"><Plus className="w-4 h-4 mr-2" /> Add Badge</Button>

      {showForm && (
        <Dialog open onOpenChange={(o) => !o && (setShowForm(false), setEditBadge(null))}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editBadge ? "Edit Badge" : "Add Badge"}</DialogTitle></DialogHeader>
            <BadgeForm badge={editBadge} onSubmit={handleSave} onCancel={() => { setShowForm(false); setEditBadge(null); }} />
          </DialogContent>
        </Dialog>
      )}

      {showAssign && (
        <Dialog open onOpenChange={(o) => !o && setShowAssign(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Award Badge Manually</DialogTitle></DialogHeader>
            <form onSubmit={handleAssign} className="space-y-4">
              <div>
                <Label className="text-xs mb-1.5 block">Employee</Label>
                <select value={assignEmpId} onChange={(e) => setAssignEmpId(e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm">
                  <option value="">Select employee...</option>
                  {employees.filter(e => e.active !== false).map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Badge</Label>
                <select value={assignBadgeId} onChange={(e) => setAssignBadgeId(e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm">
                  <option value="">Select badge...</option>
                  {badges.map(b => (
                    <option key={b.id} value={b.id}>{b.icon} {b.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAssign(false)}>Cancel</Button>
                <Button type="submit" className="flex-1 bg-primary text-black hover:bg-primary/90">Award</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export function BadgeDisplay({ employees, jobs, badges, assignments = [] }) {
  if (!badges || badges.length === 0) return () => null;

  return (empId) => {
    const earned = badges.filter(b => {
      const autoEarned = hasEmployeeEarnedBadge(empId, b, jobs, employees);
      const manualEarned = assignments.some(a => a.badge_id === b.id && a.employee_id === empId);
      return autoEarned || manualEarned;
    });
    if (earned.length === 0) return null;
    return (
      <div className="flex gap-1 flex-wrap">
        {earned.map(b => (
          <span key={b.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${COLOR_STYLES[b.color] || COLOR_STYLES.emerald}`} title={b.description || b.name}>
            {b.icon} {b.name}
          </span>
        ))}
      </div>
    );
  };
}

function BadgeForm({ badge, onSubmit, onCancel }) {
  const [name, setName] = useState(badge?.name || "");
  const [description, setDescription] = useState(badge?.description || "");
  const [icon, setIcon] = useState(badge?.icon || "🏆");
  const [criteriaType, setCriteriaType] = useState(badge?.criteria_type || "total_jobs");
  const [criteriaThreshold, setCriteriaThreshold] = useState(badge?.criteria_threshold || 10);
  const [color, setColor] = useState(badge?.color || "emerald");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), description: description.trim(), icon, criteria_type: criteriaType, criteria_threshold: Number(criteriaThreshold), color });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs mb-1.5 block">Badge Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mowing Machine" autoFocus />
        </div>
        <div>
          <Label className="text-xs mb-1.5 block">Icon (emoji)</Label>
          <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="🏆" />
        </div>
      </div>
      <div>
        <Label className="text-xs mb-1.5 block">Description</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Earned after 25 mowing jobs" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs mb-1.5 block">Criteria</Label>
          <select value={criteriaType} onChange={(e) => setCriteriaType(e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm">
            {Object.entries(CRITERIA_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs mb-1.5 block">Threshold</Label>
          <Input type="number" value={criteriaThreshold} onChange={(e) => setCriteriaThreshold(e.target.value)} />
        </div>
      </div>
      <div>
        <Label className="text-xs mb-1.5 block">Color</Label>
        <select value={color} onChange={(e) => setColor(e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm">
          <option value="emerald">Green</option>
          <option value="amber">Amber</option>
          <option value="blue">Blue</option>
          <option value="purple">Purple</option>
          <option value="red">Red</option>
        </select>
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="flex-1 bg-primary text-black hover:bg-primary/90">{badge ? "Update" : "Add"}</Button>
      </div>
    </form>
  );
}