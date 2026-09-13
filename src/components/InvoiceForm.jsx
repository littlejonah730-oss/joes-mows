import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ResponsiveSelect from "@/components/ResponsiveSelect";
import { PAYMENT_CONFIG } from "@/lib/lawnCare";
import DatePicker from "@/components/DatePicker";

export default function InvoiceForm({ invoice, jobs, customers, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    job_id: invoice?.job_id || "",
    customer_id: invoice?.customer_id || "",
    customer_name: invoice?.customer_name || "",
    amount: invoice?.amount || 0,
    status: invoice?.status || "unpaid",
    payment_method: invoice?.payment_method || "none",
    due_date: invoice?.due_date || "",
    paid_date: invoice?.paid_date || "",
    notes: invoice?.notes || "",
    description: invoice?.description || "",
  });

  const [manualCustomer, setManualCustomer] = useState(false);
  const [jobDateFilter, setJobDateFilter] = useState("");
  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  function selectCustomer(id) {
    const c = customers.find((c) => c.id === id);
    if (c) {
      setForm((p) => ({ ...p, customer_id: c.id, customer_name: c.name, amount: p.amount || c.set_price || 0 }));
    }
  }

  function selectJob(id) {
    const j = jobs.find((j) => j.id === id);
    if (j) {
      setForm((p) => ({ ...p, job_id: j.id, customer_id: j.customer_id, customer_name: j.customer_name, amount: p.amount || j.price || 0 }));
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {jobs?.length > 0 && (
          <div className="col-span-2">
            <Label htmlFor="job">Link to Job (optional)</Label>
            <Input
              type="date"
              value={jobDateFilter}
              onChange={(e) => setJobDateFilter(e.target.value)}
              className="mb-2"
            />
            <ResponsiveSelect
              value={form.job_id}
              onValueChange={selectJob}
              placeholder="Select job"
              options={jobs.filter((j) => !jobDateFilter || j.scheduled_date === jobDateFilter).map((j) => ({ value: j.id, label: `${j.customer_name} · ${j.job_type} · ${j.scheduled_date || ""}` }))}
            />
          </div>
        )}
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
          <Label htmlFor="amount">Amount ($) *</Label>
          <Input id="amount" type="number" step="0.01" value={form.amount} onChange={(e) => update("amount", parseFloat(e.target.value) || 0)} required />
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <ResponsiveSelect
            value={form.status}
            onValueChange={(v) => update("status", v)}
            options={[{ value: "unpaid", label: "Unpaid" }, { value: "paid", label: "Paid" }]}
          />
        </div>
        {form.status === "paid" && (
          <div>
            <Label htmlFor="payment_method">Payment Method</Label>
            <ResponsiveSelect
              value={form.payment_method}
              onValueChange={(v) => update("payment_method", v)}
              options={Object.entries(PAYMENT_CONFIG).filter(([k]) => k !== "none").map(([k, v]) => ({ value: k, label: `${v.icon} ${v.label}` }))}
            />
          </div>
        )}
        {form.status === "paid" && (
          <div>
            <Label htmlFor="paid_date">Paid Date</Label>
            <DatePicker value={form.paid_date} onChange={(v) => update("paid_date", v)} placeholder="Pick a date" />
          </div>
        )}
        <div>
          <Label htmlFor="due_date">Due Date</Label>
          <DatePicker value={form.due_date} onChange={(v) => update("due_date", v)} placeholder="Pick a date" />
        </div>
        <div className="col-span-2">
          <Label htmlFor="description">Description</Label>
          <Input id="description" value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Lawn mowing service" />
        </div>
        <div className="col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={2} placeholder="Discount applied, late fee waived..." />
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-primary text-black hover:bg-primary/90">
          {invoice?.id ? "Update" : "Create"} Invoice
        </Button>
      </div>
    </form>
  );
}