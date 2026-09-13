import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ResponsiveSelect from "@/components/ResponsiveSelect";
import { RECURRING_CONFIG } from "@/lib/lawnCare";

export default function CustomerForm({ customer, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: customer?.name || "",
    phone: customer?.phone || "",
    address: customer?.address || "",
    notes: customer?.notes || "",
    set_price: customer?.set_price || 0,
    is_recurring: customer?.is_recurring || false,
    recurring_rule: customer?.recurring_rule || "by_request",
    preferred_contact: customer?.preferred_contact || "text",
    mulch_type: customer?.mulch_type || "mulched",
    client_quality: customer?.client_quality || 3,
    active: customer?.active !== false,
  });

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label htmlFor="name">Name *</Label>
          <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} required placeholder="John Smith" />
        </div>
        <div className="col-span-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="(555) 123-4567" />
        </div>
        <div className="col-span-2">
          <Label htmlFor="address">Address</Label>
          <Input id="address" value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="123 Main St, City, ST" />
        </div>
        <div>
          <Label htmlFor="set_price">Set Price ($)</Label>
          <Input id="set_price" type="number" step="0.01" value={form.set_price} onChange={(e) => update("set_price", parseFloat(e.target.value) || 0)} />
        </div>
        <div>
          <Label htmlFor="preferred_contact">Preferred Contact</Label>
          <ResponsiveSelect
            value={form.preferred_contact}
            onValueChange={(v) => update("preferred_contact", v)}
            options={[{ value: "text", label: "Text" }, { value: "phone", label: "Phone Call" }]}
          />
        </div>
        <div>
          <Label htmlFor="mulch_type">Mulch Type</Label>
          <ResponsiveSelect
            value={form.mulch_type}
            onValueChange={(v) => update("mulch_type", v)}
            options={[
              { value: "mulched", label: "🌾 Mulched" },
              { value: "bagged", label: "🥡 Bagged" },
              { value: "flush_chuted", label: "🕳️ Flush Chuted" },
            ]}
          />
        </div>
        <div>
          <Label htmlFor="client_quality">Client Quality (1-5)</Label>
          <ResponsiveSelect
            value={String(form.client_quality)}
            onValueChange={(v) => update("client_quality", parseInt(v))}
            options={[
              { value: "1", label: "⭐ Poor" },
              { value: "2", label: "⭐⭐ Fair" },
              { value: "3", label: "⭐⭐⭐ Average" },
              { value: "4", label: "⭐⭐⭐⭐ Good" },
              { value: "5", label: "⭐⭐⭐⭐⭐ Great" },
            ]}
          />
        </div>
        <div className="flex items-center gap-3 col-span-2 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={(e) => update("active", e.target.checked)} className="w-4 h-4 rounded accent-primary" />
            <span className="text-sm font-medium">Active customer</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_recurring} onChange={(e) => update("is_recurring", e.target.checked)} className="w-4 h-4 rounded accent-primary" />
            <span className="text-sm font-medium">Recurring customer</span>
          </label>
          {form.is_recurring && (
            <ResponsiveSelect
              value={form.recurring_rule}
              onValueChange={(v) => update("recurring_rule", v)}
              options={Object.entries(RECURRING_CONFIG).filter(([k]) => k !== "one_time").map(([k, v]) => ({ value: k, label: v.label }))}
            />
          )}
        </div>
        <div className="col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3} placeholder="Yard has sprinkler heads, prefers edging first..." />
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-primary text-black hover:bg-primary/90">
          {customer?.id ? "Update" : "Add"} Customer
        </Button>
      </div>
    </form>
  );
}