import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ResponsiveSelect from "@/components/ResponsiveSelect";
import DatePicker from "@/components/DatePicker";

const CATEGORIES = [
  { value: "fuel", label: "⛽ Fuel" },
  { value: "equipment", label: "🔧 Equipment" },
  { value: "supplies", label: "📦 Supplies" },
  { value: "labor", label: "👷 Labor" },
  { value: "other", label: "📋 Other" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "💵 Cash" },
  { value: "check", label: "🧾 Check" },
  { value: "card", label: "💳 Card" },
  { value: "other", label: "🔁 Other" },
];

export default function ExpenseForm({ expense, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    amount: expense?.amount || 0,
    category: expense?.category || "other",
    description: expense?.description || "",
    vendor: expense?.vendor || "",
    date: expense?.date || new Date().toISOString().slice(0, 10),
    payment_method: expense?.payment_method || "other",
  });

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="amount">Amount ($) *</Label>
          <Input id="amount" type="number" step="0.01" value={form.amount} onChange={(e) => update("amount", parseFloat(e.target.value) || 0)} required />
        </div>
        <div>
          <Label htmlFor="date">Date</Label>
          <DatePicker value={form.date} onChange={(v) => update("date", v)} placeholder="Pick a date" />
        </div>
        <div className="col-span-2">
          <Label htmlFor="category">Category</Label>
          <ResponsiveSelect value={form.category} onValueChange={(v) => update("category", v)} options={CATEGORIES} />
        </div>
        <div className="col-span-2">
          <Label htmlFor="payment_method">Payment Method</Label>
          <ResponsiveSelect value={form.payment_method} onValueChange={(v) => update("payment_method", v)} options={PAYMENT_METHODS} />
        </div>
        <div className="col-span-2">
          <Label htmlFor="vendor">Vendor</Label>
          <Input id="vendor" value={form.vendor} onChange={(e) => update("vendor", e.target.value)} placeholder="Home Depot, Shell, etc." />
        </div>
        <div className="col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" value={form.description} onChange={(e) => update("description", e.target.value)} rows={2} placeholder="What was this expense for?" />
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-primary text-black hover:bg-primary/90">
          {expense?.id ? "Update" : "Add"} Expense
        </Button>
      </div>
    </form>
  );
}