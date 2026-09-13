import { useEntityCollection } from "@/hooks/useEntityCollection";
import { formatCurrency } from "@/lib/lawnCare";
import { Landmark, Wallet, Wrench, PiggyBank, Receipt, TrendingUp } from "lucide-react";

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-muted-foreground"><Icon className="w-3.5 h-3.5" /> {label}</span>
      <span className="font-medium">{formatCurrency(value)}</span>
    </div>
  );
}

export default function NetWorthCard({ invoices, expenses, annualNetProfit }) {
  const { data: equipment = [] } = useEntityCollection("Equipment");

  const paidRevenue = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + (i.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const outstanding = invoices.filter((i) => i.status === "unpaid").reduce((s, i) => s + (i.amount || 0), 0);
  const equipmentValue = equipment.reduce((s, e) => s + (e.purchase_price || 0), 0);
  const netProfit = paidRevenue - totalExpenses;
  const netWorth = equipmentValue + netProfit + outstanding;

  const base = annualNetProfit > 0 ? annualNetProfit : 0;
  const lowVal = base * 2 + netWorth;
  const highVal = base * 3 + netWorth;
  const midVal = base * 2.5 + netWorth;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 mb-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="font-semibold flex items-center gap-2"><Landmark className="w-4 h-4 text-primary" /> Business Net Worth</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Net Worth</p>
          <p className="text-3xl font-bold text-primary">{formatCurrency(netWorth)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Equip {formatCurrency(equipmentValue)} + Cash {formatCurrency(netProfit)} + Owed {formatCurrency(outstanding)}</p>
        </div>
        <div className="rounded-xl border border-border bg-emerald-500/5 p-4">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><TrendingUp className="w-3 h-3" /> Estimated Sale Value</p>
          <p className="text-3xl font-bold text-emerald-400">{formatCurrency(midVal)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{formatCurrency(lowVal)} – {formatCurrency(highVal)} · 2–3× annual profit + net worth (incl. all equipment)</p>
        </div>
      </div>

      <div className="rounded-xl border border-border p-3">
        <p className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-emerald-400"><Wallet className="w-3.5 h-3.5" /> Breakdown</p>
        <div className="space-y-1.5 text-sm">
          <Row icon={Wrench} label="Equipment value" value={equipmentValue} />
          <Row icon={PiggyBank} label="Cash (paid rev − expenses)" value={netProfit} />
          <Row icon={Receipt} label="Owed to business" value={outstanding} />
          <div className="flex justify-between pt-1.5 border-t border-border font-semibold"><span>Net Worth</span><span className="text-primary">{formatCurrency(netWorth)}</span></div>
        </div>
      </div>
    </div>
  );
}