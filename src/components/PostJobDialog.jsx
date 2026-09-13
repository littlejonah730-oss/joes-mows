import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ResponsiveSelect from "@/components/ResponsiveSelect";
import DatePicker from "@/components/DatePicker";
import { ASSIGNMENT_CONFIG } from "@/lib/lawnCare";
import { Send } from "lucide-react";

export default function PostJobDialog({ employee, customers, onPost, onClose }) {
  const [form, setForm] = useState({
    customer_id: "",
    customer_name: "",
    customer_address: "",
    scheduled_date: new Date().toISOString().slice(0, 10),
    price: 0,
    job_type: "Mow",
    notes: "",
    employee_assignment: "helping",
  });
  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  function selectCustomer(id) {
    const c = customers.find((c) => c.id === id);
    if (c) {
      setForm((p) => ({ ...p, customer_id: c.id, customer_name: c.name, customer_address: c.address || "", price: c.set_price || 0 }));
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.customer_name) return;
    onPost({
      ...form,
      status: "scheduled",
      service_line: "mowing",
      recurring_rule: "one_time",
      is_recurring: false,
      highlighted: true,
      claimed_by_employee_id: employee.id,
      claimed_by_name: employee.name,
      claimed_at: new Date().toISOString(),
      exclusive_to_employee_id: employee.id,
      exclusive_to_employee_name: employee.name,
      needs_help: form.employee_assignment === "helping",
    });
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            Post Job to {employee.name}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-xs text-muted-foreground bg-primary/10 rounded-lg p-2">
            🔒 This job goes <span className="font-bold text-primary">only</span> to {employee.name} — nobody else can see or claim it.
          </p>
          <div>
            <Label className="text-xs mb-1.5 block">Customer *</Label>
            {customers.length > 0 ? (
              <ResponsiveSelect
                value={form.customer_id}
                onValueChange={selectCustomer}
                placeholder="Select customer"
                options={customers.map((c) => ({ value: c.id, label: c.name }))}
              />
            ) : (
              <Input value={form.customer_name} onChange={(e) => update("customer_name", e.target.value)} placeholder="Customer name" required />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1.5 block">Job Type</Label>
              <Input value={form.job_type} onChange={(e) => update("job_type", e.target.value)} placeholder="Mow" />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Price ($)</Label>
              <Input type="number" step="0.01" value={form.price} onChange={(e) => update("price", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs mb-1.5 block">Scheduled Date</Label>
              <DatePicker value={form.scheduled_date} onChange={(v) => update("scheduled_date", v)} placeholder="Pick a date" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs mb-1.5 block">Assignment</Label>
              <div className="flex gap-2">
                {Object.entries(ASSIGNMENT_CONFIG).map(([key, cfg]) => (
                  <button key={key} type="button" onClick={() => update("employee_assignment", key)}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${form.employee_assignment === key ? `${cfg.bg} ${cfg.color} ring-1 ring-current` : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                    {cfg.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Solo = 65% pay · Helping = 40% pay · Urgent = priority</p>
            </div>
            <div className="col-span-2">
              <Label className="text-xs mb-1.5 block">Notes</Label>
              <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={2} placeholder="Special instructions..." />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-primary text-black hover:bg-primary/90">
              <Send className="w-3.5 h-3.5 mr-1.5" /> Post to {employee.name}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}