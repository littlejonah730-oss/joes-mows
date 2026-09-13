import { useState } from "react";
import { useEntityCollection } from "@/hooks/useEntityCollection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Gift, Trash2, Edit2 } from "lucide-react";

export default function RewardTierManager({ employees }) {
  const { data: rewards = [], createItem, updateItem, deleteItem } = useEntityCollection("Reward");
  const [showForm, setShowForm] = useState(false);
  const [editReward, setEditReward] = useState(null);

  const sorted = [...rewards].sort((a, b) => (a.jobs_required || 0) - (b.jobs_required || 0));

  function getEarnedCount(reward) {
    return employees.filter(e => (e.yards_completed || 0) >= (reward.jobs_required || 0)).length;
  }

  const handleSave = (data) => {
    if (editReward) updateItem({ id: editReward.id, ...data });
    else createItem(data);
    setShowForm(false);
    setEditReward(null);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 mb-6">
      <h2 className="font-semibold mb-4 flex items-center gap-2">
        <Gift className="w-4 h-4 text-primary" />
        Reward Tiers
      </h2>
      <p className="text-xs text-muted-foreground mb-3">Employees progress through tiers as they complete jobs. After claiming a reward, the bar advances to the next goal.</p>
      <div className="space-y-2 mb-3">
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No reward tiers yet. Add one to motivate your team!</p>
        ) : (
          sorted.map((reward, idx) => (
            <div key={reward.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Gift className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{reward.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{reward.description || `Reward at ${reward.jobs_required} jobs`} · {getEarnedCount(reward)} eligible</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-bold text-primary">{reward.jobs_required}</span>
                <span className="text-xs text-muted-foreground">jobs</span>
                <button onClick={() => { setEditReward(reward); setShowForm(true); }} className="p-1.5 rounded-md hover:bg-muted"><Edit2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                <button onClick={() => deleteItem(reward.id)} className="p-1.5 rounded-md hover:bg-muted"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
              </div>
            </div>
          ))
        )}
      </div>
      <Button onClick={() => { setEditReward(null); setShowForm(true); }} variant="outline" className="w-full"><Plus className="w-4 h-4 mr-2" /> Add Reward Tier</Button>

      {showForm && (
        <Dialog open onOpenChange={(o) => !o && (setShowForm(false), setEditReward(null))}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editReward ? "Edit Reward Tier" : "Add Reward Tier"}</DialogTitle></DialogHeader>
            <RewardForm reward={editReward} onSubmit={handleSave} onCancel={() => { setShowForm(false); setEditReward(null); }} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function RewardForm({ reward, onSubmit, onCancel }) {
  const [name, setName] = useState(reward?.name || "");
  const [description, setDescription] = useState(reward?.description || "");
  const [jobsRequired, setJobsRequired] = useState(reward?.jobs_required || 10);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), description: description.trim(), jobs_required: Number(jobsRequired) });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="text-xs mb-1.5 block">Reward Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Snack" autoFocus />
      </div>
      <div>
        <Label className="text-xs mb-1.5 block">Description</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A free snack from the break room" />
      </div>
      <div>
        <Label className="text-xs mb-1.5 block">Jobs Required</Label>
        <Input type="number" value={jobsRequired} onChange={(e) => setJobsRequired(e.target.value)} />
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="flex-1 bg-primary text-black hover:bg-primary/90">{reward ? "Update" : "Add"}</Button>
      </div>
    </form>
  );
}