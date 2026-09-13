import { useState } from "react";
import { useEntityCollection } from "@/hooks/useEntityCollection";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Wrench, Plus, Trash2, Edit } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Image } from "@/components/ui/image";
import { formatDateShort, formatCurrency } from "@/lib/lawnCare";
import EquipmentMaintenanceList from "@/components/EquipmentMaintenanceList";
import { getDueTasks } from "@/lib/equipmentMaintenance";

const EQUIP_TYPES = [
  { value: "mower", label: "Mower", icon: "🌾" },
  { value: "trimmer", label: "Trimmer", icon: "✂️" },
  { value: "blower", label: "Blower", icon: "💨" },
  { value: "other", label: "Other", icon: "🔧" },
];

const EQUIP_STATUSES = [
  { value: "available", label: "Available" },
  { value: "in_use", label: "In Use" },
  { value: "maintenance", label: "Maintenance" },
];

export default function EquipmentUtilization() {
  const { data: equipment = [], createItem: createEquip, updateItem: updateEquip, deleteItem: deleteEquip } = useEntityCollection("Equipment");
  const { data: usageRecords = [] } = useEntityCollection("EquipmentUsage");
  const { toast } = useToast();

  // Marking one task done resets only that task's counter — other tasks untouched
  function handleMarkTaskDone(taskId) {
    const eq = detailEquip;
    if (!eq) return;
    const today = new Date().toISOString().slice(0, 10);
    let state = {};
    try { state = eq.maintenance_state ? JSON.parse(eq.maintenance_state) : {}; } catch (e) { state = {}; }
    state[taskId] = { date: today };
    const maintenance_state = JSON.stringify(state);
    updateEquip({ id: eq.id, maintenance_state });
    setDetailEquip({ ...eq, maintenance_state });
    toast({ title: "Task done — counter reset" });
  }

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", model: "", type: "mower", purchase_price: 0, resale_value: 0, purchase_date: "", status: "available", notes: "", image_url: "" });
  const [editEquip, setEditEquip] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [detailEquip, setDetailEquip] = useState(null);

  async function handleAdd() {
    if (!form.name) return;
    let image_url = form.image_url || "";
    if (imageFile) {
      setUploading(true);
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: imageFile });
        image_url = file_url;
      } catch (e) {
        toast({ title: "Image upload failed", variant: "destructive" });
      }
      setUploading(false);
    }
    const wasEditing = !!editEquip;
    if (editEquip) {
      updateEquip({ id: editEquip.id, name: form.name, model: form.model, type: form.type, purchase_price: form.purchase_price, resale_value: form.resale_value, purchase_date: form.purchase_date, status: form.status, notes: form.notes, image_url });
      setEditEquip(null);
    } else {
      createEquip({ name: form.name, model: form.model, type: form.type, purchase_price: form.purchase_price, resale_value: form.resale_value, purchase_date: form.purchase_date, status: form.status, notes: form.notes, image_url });
    }
    setForm({ name: "", model: "", type: "mower", purchase_price: 0, resale_value: 0, purchase_date: "", status: "available", notes: "", image_url: "" });
    setImageFile(null);
    setAddDialogOpen(false);
    toast({ title: wasEditing ? "Equipment updated" : "Equipment added" });
  }

  function openEdit(eq) {
    setEditEquip(eq);
    setForm({ name: eq.name || "", model: eq.model || "", type: eq.type || "mower", purchase_price: eq.purchase_price || 0, resale_value: eq.resale_value || 0, purchase_date: eq.purchase_date || "", status: eq.status || "available", notes: eq.notes || "", image_url: eq.image_url || "" });
    setImageFile(null);
    setAddDialogOpen(true);
  }

  function handleDeleteEquip(eq) {
    deleteEquip(eq.id);
    toast({ title: "Equipment removed" });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold flex items-center gap-2"><Wrench className="w-4 h-4 text-primary" /> Equipment ({equipment.length})</h3>
        <Button size="sm" onClick={() => { setEditEquip(null); setForm({ name: "", model: "", type: "mower", purchase_price: 0, resale_value: 0, purchase_date: "", status: "available", notes: "", image_url: "" }); setAddDialogOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Equipment</Button>
      </div>

      {equipment.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] text-muted-foreground uppercase">Resale Value</p>
            <p className="text-lg font-bold">{formatCurrency(equipment.reduce((s, e) => s + (e.resale_value > 0 ? e.resale_value : (e.purchase_price || 0) * 0.5), 0))}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] text-muted-foreground uppercase">Available</p>
            <p className="text-lg font-bold text-emerald-400">{equipment.filter((e) => e.status === "available").length}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] text-muted-foreground uppercase">In Use</p>
            <p className="text-lg font-bold text-amber-400">{equipment.filter((e) => e.status === "in_use").length}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] text-muted-foreground uppercase">Maintenance</p>
            <p className="text-lg font-bold text-red-400">{equipment.filter((e) => e.status === "maintenance").length}</p>
          </div>
        </div>
      )}

      {equipment.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No equipment yet. Add mowers, trimmers, or blowers to track your fleet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {equipment.map((eq) => {
            const typeCfg = EQUIP_TYPES.find((t) => t.value === eq.type) || EQUIP_TYPES[3];
            const dueTasks = getDueTasks(eq, usageRecords.filter((u) => u.equipment_id === eq.id));
            return (
              <div key={eq.id} className="rounded-xl border border-border bg-card p-3 cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setDetailEquip(eq)}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {eq.image_url ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted">
                        <Image src={eq.image_url} alt={eq.name} fittingType="fill" className="w-full h-full" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-xl">{typeCfg.icon}</div>
                    )}
                    <div>
                      <p className="font-medium text-sm">{eq.name}</p>
                      <p className="text-[10px] text-muted-foreground">{typeCfg.label}{eq.model ? ` · ${eq.model}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => openEdit(eq)} className="text-muted-foreground hover:text-primary"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteEquip(eq)} className="text-muted-foreground hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${eq.status === "available" ? "bg-emerald-500/10 text-emerald-400" : eq.status === "maintenance" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"}`}>
                    {eq.status === "available" ? "Available" : eq.status === "maintenance" ? "Maintenance" : "In Use"}
                  </span>
                  {dueTasks.length > 0 && (
                    <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full">{dueTasks.length} MAINT DUE</span>
                  )}
                  <span className="text-[10px] text-muted-foreground shrink-0">{eq.purchase_price ? formatCurrency(eq.purchase_price) : ""}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editEquip ? "Edit Equipment" : "Add Equipment"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Equipment name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Model (e.g. Stihl 4245, Ooni 2410)" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Type</label>
              <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {EQUIP_TYPES.map((t) => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Status</label>
              <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {EQUIP_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <Input type="number" placeholder="Purchase price" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: Number(e.target.value) })} />
            <Input type="number" placeholder="Resale value (current)" value={form.resale_value} onChange={(e) => setForm({ ...form, resale_value: Number(e.target.value) })} />
            <Input type="date" placeholder="Purchase date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} />
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
              <Input placeholder="Notes..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Equipment Image</label>
              {form.image_url && !imageFile && (
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted mb-2">
                  <Image src={form.image_url} alt="Current" fittingType="fill" className="w-full h-full" />
                </div>
              )}
              <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <DialogFooter><Button onClick={handleAdd} disabled={uploading}>{uploading ? "Uploading..." : editEquip ? "Save Changes" : "Add Equipment"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailEquip} onOpenChange={(open) => { if (!open) setDetailEquip(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{detailEquip?.name}</DialogTitle></DialogHeader>
          {detailEquip && (() => {
            const typeCfg = EQUIP_TYPES.find((t) => t.value === detailEquip.type) || EQUIP_TYPES[3];
            return (
              <div className="space-y-4">
                {detailEquip.image_url && (
                  <div className="w-full h-40 rounded-lg overflow-hidden bg-muted">
                    <Image src={detailEquip.image_url} alt={detailEquip.name} fittingType="fill" className="w-full h-full" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-[10px] text-muted-foreground uppercase">Model</p>
                    <p className="text-sm font-medium">{detailEquip.model || "—"}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-[10px] text-muted-foreground uppercase">Type</p>
                    <p className="text-sm font-medium">{typeCfg.icon} {typeCfg.label}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-[10px] text-muted-foreground uppercase">Status</p>
                    <p className={`text-sm font-medium ${detailEquip.status === "available" ? "text-emerald-400" : detailEquip.status === "maintenance" ? "text-red-400" : "text-amber-400"}`}>
                      {detailEquip.status === "available" ? "Available" : detailEquip.status === "maintenance" ? "Maintenance" : "In Use"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-[10px] text-muted-foreground uppercase">Purchase Price</p>
                    <p className="text-sm font-medium">{detailEquip.purchase_price ? formatCurrency(detailEquip.purchase_price) : "—"}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-[10px] text-muted-foreground uppercase">Purchased</p>
                    <p className="text-sm font-medium">{detailEquip.purchase_date ? formatDateShort(detailEquip.purchase_date) : "—"}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-[10px] text-muted-foreground uppercase">Jobs Completed</p>
                    <p className="text-sm font-medium">{detailEquip.jobs_completed || 0}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-[10px] text-muted-foreground uppercase">Hours Used</p>
                    <p className="text-sm font-medium">{(detailEquip.hours_used || 0).toFixed(1)}h</p>
                  </div>
                </div>
                <EquipmentMaintenanceList
                  equipment={detailEquip}
                  usageRecords={usageRecords.filter((u) => u.equipment_id === detailEquip.id)}
                  onMarkDone={handleMarkTaskDone}
                />
                {detailEquip.notes && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase mb-1">Notes</p>
                    <p className="text-sm">{detailEquip.notes}</p>
                  </div>
                )}
                <Button variant="outline" className="w-full" onClick={() => { const eq = detailEquip; setDetailEquip(null); openEdit(eq); }}><Edit className="w-4 h-4 mr-1" /> Edit Equipment</Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}