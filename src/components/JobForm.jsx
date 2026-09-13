import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ResponsiveSelect from "@/components/ResponsiveSelect";
import { STATUS_CONFIG, RECURRING_CONFIG, ASSIGNMENT_CONFIG } from "@/lib/lawnCare";
import DatePicker from "@/components/DatePicker";

const PAUSE_REASONS = ["Out of town", "Weather delay", "Other"];

export default function JobForm({ job, customers, employees = [], onSubmit, onCancel }) {
  const [form, setForm] = useState({
    customer_id: job?.customer_id || "",
    customer_name: job?.customer_name || "",
    customer_address: job?.customer_address || "",
    scheduled_date: job?.scheduled_date ? new Date(job.scheduled_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    status: job?.status || "scheduled",
    price: job?.price || 0,
    service_line: job?.service_line || "mowing",
    job_type: job?.job_type || "Mow",
    notes: job?.notes || "",
    recurring_rule: job?.recurring_rule || "one_time",
    pause_reason: job?.pause_reason || "",
    is_recurring: job?.is_recurring || false,
    difficulty: job?.difficulty || 3,
    employee_assignment: job?.employee_assignment || "helping",
    claimed_by_employee_id: job?.claimed_by_employee_id || "",
    claimed_by_name: job?.claimed_by_name || "",
    highlighted: job?.highlighted || false,
  });

  const [manualCustomer, setManualCustomer] = useState(false);
  const [workerMode, setWorkerMode] = useState(job?.claimed_by_employee_id ? "employee" : job?.claimed_by_name ? "helper" : "none");
  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  function selectCustomer(id) {
    const c = customers.find((c) => c.id === id);
    if (c) {
      setForm((p) => ({
        ...p,
        customer_id: c.id,
        customer_name: c.name,
        customer_address: c.address || "",
        price: p.price || c.set_price || 0,
        is_recurring: c.is_recurring || false,
        recurring_rule: c.recurring_rule || "one_time",
      }));
    }
  }

  function selectEmployee(id) {
    const emp = employees.find((e) => e.id === id);
    if (emp) {
      setForm((p) => ({
        ...p,
        claimed_by_employee_id: emp.id,
        claimed_by_name: emp.name,
        highlighted: true,
      }));
    } else {
      setForm((p) => ({ ...p, claimed_by_employee_id: "", claimed_by_name: "" }));
    }
  }

  function setHelperName(name) {
    setForm((p) => ({
      ...p,
      claimed_by_employee_id: "",
      claimed_by_name: name,
      highlighted: name ? true : p.highlighted,
    }));
  }

  function clearWorker() {
    setForm((p) => ({ ...p, claimed_by_employee_id: "", claimed_by_name: "", highlighted: false }));
    setWorkerMode("none");
  }

  function handleSubmit(e) {
    e.preventDefault();
    const workerActive = workerMode === "employee" ? !!form.claimed_by_employee_id : workerMode === "helper" ? !!form.claimed_by_name : false;
    const submitData = {
      ...form,
      is_recurring: form.recurring_rule !== "one_time" && form.recurring_rule !== "by_request",
      highlighted: workerActive ? true : form.highlighted,
    };
    if (!workerActive) {
      submitData.claimed_by_employee_id = "";
      submitData.claimed_by_name = "";
      submitData.claimed_at = null;
    }
    if (submitData.status === "cancelled") {
      submitData.price = 0;
    }
    delete submitData.claimed_at;
    onSubmit(submitData);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-1.5">
            <Label htmlFor="customer">Customer *</Label>
            <button
              type="button"
              onClick={() => { setManualCustomer(!manualCustomer); if (!manualCustomer) { update("customer_id", ""); } }}
              className="text-[11px] text-primary hover:underline"
            >
              {manualCustomer ? "Select from list" : "One-time customer"}
            </button>
          </div>
          {manualCustomer ? (
            <Input
              id="customer"
              value={form.customer_name}
              onChange={(e) => update("customer_name", e.target.value)}
              placeholder="Type customer name"
              required
            />
          ) : (
            <ResponsiveSelect
              value={form.customer_id}
              onValueChange={selectCustomer}
              placeholder="Select customer"
              options={customers.map((c) => ({ value: c.id, label: c.name }))}
            />
          )}
        </div>
        <div>
          <Label htmlFor="job_type">Job Type</Label>
          <Input id="job_type" value={form.job_type} onChange={(e) => update("job_type", e.target.value)} placeholder="Mow" />
        </div>
        <div>
          <Label htmlFor="price">Price ($)</Label>
          <Input id="price" type="number" step="0.01" value={form.price} onChange={(e) => update("price", parseFloat(e.target.value) || 0)} />
        </div>
        <div className="col-span-2">
          <Label htmlFor="difficulty">Difficulty (1-5)</Label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(level => (
              <button key={level} type="button" onClick={() => update("difficulty", level)} className={`flex-1 h-9 rounded-md text-sm font-medium transition-colors ${(form.difficulty || 3) >= level ? "bg-amber-500/80 text-black" : "bg-muted text-muted-foreground"}`}>
                {level}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label htmlFor="scheduled_date">Scheduled Date</Label>
          <DatePicker value={form.scheduled_date} onChange={(v) => update("scheduled_date", v)} placeholder="Pick a date" />
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <ResponsiveSelect
            value={form.status}
            onValueChange={(v) => update("status", v)}
            options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))}
          />
        </div>
        <div>
          <Label htmlFor="recurring_rule">Recurring Rule</Label>
          <ResponsiveSelect
            value={form.recurring_rule}
            onValueChange={(v) => update("recurring_rule", v)}
            options={Object.entries(RECURRING_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))}
          />
        </div>
        {(form.status === "paused" || form.status === "cancelled") && (
          <div>
            <Label htmlFor="pause_reason">Reason</Label>
            <ResponsiveSelect
              value={form.pause_reason}
              onValueChange={(v) => update("pause_reason", v)}
              placeholder="Select reason"
              options={PAUSE_REASONS.map((r) => ({ value: r, label: r }))}
            />
            {form.pause_reason === "Other" && (
              <Input className="mt-2" value={form.pause_reason} onChange={(e) => update("pause_reason", e.target.value)} placeholder="Custom reason" />
            )}
          </div>
        )}

        {/* Worker Assignment Section */}
        <div className="col-span-2 rounded-lg border border-border bg-muted/20 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Worker</Label>
            {form.claimed_by_name && (
              <button type="button" onClick={clearWorker} className="text-[11px] text-red-400 hover:underline">Remove</button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => { setWorkerMode("employee"); if (!employees.length) setWorkerMode("helper"); }}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${workerMode === "employee" ? "bg-primary text-black" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              Employee
            </button>
            <button type="button" onClick={() => { setWorkerMode("helper"); setForm((p) => ({ ...p, claimed_by_employee_id: "" })); }}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${workerMode === "helper" ? "bg-primary text-black" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              One-time Helper
            </button>
            <button type="button" onClick={clearWorker}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${workerMode === "none" ? "bg-primary text-black" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              None
            </button>
          </div>
          {workerMode === "employee" && (
            <select
              value={form.claimed_by_employee_id}
              onChange={(e) => selectEmployee(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">Select employee...</option>
              {employees.map((e) => (<option key={e.id} value={e.id}>{e.name}</option>))}
            </select>
          )}
          {workerMode === "helper" && (
            <Input
              value={form.claimed_by_name}
              onChange={(e) => setHelperName(e.target.value)}
              placeholder="Type helper name"
            />
          )}
          {form.claimed_by_name && (
            <div>
              <Label className="text-[11px] mb-1.5 block">Assignment</Label>
              <div className="flex gap-2">
                {Object.entries(ASSIGNMENT_CONFIG).map(([key, cfg]) => (
                  <button key={key} type="button" onClick={() => update("employee_assignment", key)}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${form.employee_assignment === key ? `${cfg.bg} ${cfg.color} ring-1 ring-current` : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                    {cfg.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">Solo = 65% pay · Helping = 40% pay · Urgent = priority</p>
            </div>
          )}
        </div>

        <div className="col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3} placeholder="Yard has sprinkler heads, customer prefers edging first..." />
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-primary text-black hover:bg-primary/90">
          {job?.id ? "Update" : "Add"} Job
        </Button>
      </div>
    </form>
  );
}