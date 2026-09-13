import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/lawnCare";
import { Calculator, TrendingUp, Info, Check } from "lucide-react";

const DIFFICULTY_MULT = { 1: 0.85, 2: 0.95, 3: 1.0, 4: 1.15, 5: 1.35 };

const DEFAULT_RATE = 7; // $/1000sqft fallback

// Base service = Mow + Edge + Blow (always included, 1.0x)
// Add-ons stack on top as additive multipliers
const ADDONS = [
  { key: "Bagging", mult: 0.15 },
  { key: "Leaf Cleanup", mult: 0.35 },
  { key: "Hedge Trimming", mult: 0.2 },
  { key: "Tree Trimming", mult: 1.0 },
  { key: "Weed Kill", mult: 0.25 },
];

export default function PriceCalculator({ customers = [], jobs = [] }) {
  const [yardSize, setYardSize] = useState("");
  const [difficulty, setDifficulty] = useState(3);
  const [surcharge, setSurcharge] = useState("");
  const [selectedAddons, setSelectedAddons] = useState({});

  const stats = useMemo(() => {
    const completed = jobs.filter((j) => j.status === "completed");
    const allPrices = completed.map((j) => j.price || 0).filter((p) => p > 0).sort((a, b) => a - b);

    let avgPrice = 0;
    if (allPrices.length > 0) {
      avgPrice = allPrices.reduce((s, p) => s + p, 0) / allPrices.length;
    }

    // Per-1000sqft rates from customers with yard sizes
    const customersWithSize = customers.filter((c) => c.yard_size_sqft > 0);
    const rates = customersWithSize.map((c) => {
      const custCompleted = completed.filter((j) => j.customer_id === c.id);
      const revenue = custCompleted.reduce((s, j) => s + (j.price || 0), 0);
      const avgJobPrice = custCompleted.length > 0 ? revenue / custCompleted.length : (c.set_price || 0);
      if (avgJobPrice <= 0) return null;
      return avgJobPrice / (c.yard_size_sqft / 1000);
    }).filter((r) => r !== null && r > 0).sort((a, b) => a - b);

    let avgRate = DEFAULT_RATE;
    if (rates.length > 0) {
      avgRate = rates.reduce((s, r) => s + r, 0) / rates.length;
    }

    return {
      avgPrice,
      avgRate,
      hasRateData: rates.length > 0,
      customersWithSize: customersWithSize.length,
      totalCompleted: completed.length,
    };
  }, [customers, jobs]);

  const sizeK = (parseFloat(yardSize) || 0) / 1000;
  const extra = parseFloat(surcharge) || 0;
  const diffMult = DIFFICULTY_MULT[difficulty] || 1;
  const addonMult = ADDONS.filter((a) => selectedAddons[a.key]).reduce((s, a) => s + a.mult, 0);
  const totalMult = 1.0 + addonMult;

  const baseFromRate = sizeK * stats.avgRate;
  const suggestedPrice = Math.round((baseFromRate * totalMult * diffMult + extra) / 5) * 5;

  const toggleAddon = (key) =>
    setSelectedAddons((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div>
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 mb-4">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Calculator className="w-3.5 h-3.5 text-primary" />
          {stats.hasRateData
            ? `Based on your average rate of ${formatCurrency(stats.avgRate)} per 1,000 sq ft from ${stats.customersWithSize} customers with yard sizes.`
            : `Add yard sizes to your customers to get per-sqft pricing. Using default rate of ${formatCurrency(DEFAULT_RATE)} per 1,000 sq ft.`
          }
        </p>
      </div>

      {/* Your Pricing Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-[9px] font-semibold text-muted-foreground uppercase mb-0.5">Avg Job Price</p>
          <p className="text-lg font-bold">{formatCurrency(stats.avgPrice)}</p>
          <p className="text-[10px] text-muted-foreground">{stats.totalCompleted} completed jobs</p>
        </div>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
          <p className="text-[9px] font-semibold text-muted-foreground uppercase mb-0.5 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Your Avg Rate</p>
          <p className="text-lg font-bold text-primary">{formatCurrency(stats.avgRate)}/1k sqft</p>
          <p className="text-[10px] text-muted-foreground">{stats.customersWithSize} customers sized</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Yard Size (sq ft)</label>
          <input
            type="number"
            value={yardSize}
            onChange={(e) => setYardSize(e.target.value)}
            placeholder="e.g. 8000"
            className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm"
          />
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">
            Base: <span className="text-foreground font-semibold">Mow + Edge + Blow</span> (included)
          </p>
          <p className="text-[10px] text-muted-foreground mb-2">Add any extra services:</p>
          <div className="grid grid-cols-1 gap-2">
            {ADDONS.map((a) => (
              <button
                key={a.key}
                onClick={() => toggleAddon(a.key)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors select-none ${
                  selectedAddons[a.key] ? "bg-primary/15 border border-primary/40 text-foreground" : "bg-muted text-muted-foreground hover:text-foreground border border-transparent"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded border flex items-center justify-center ${selectedAddons[a.key] ? "bg-primary border-primary" : "border-border"}`}>
                    {selectedAddons[a.key] && <Check className="w-3 h-3 text-primary-foreground" />}
                  </span>
                  {a.key}
                </span>
                <span className="text-[11px] text-muted-foreground">+{Math.round(a.mult * 100)}%</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Extra / Surcharge ($)</label>
            <input
              type="number"
              value={surcharge}
              onChange={(e) => setSurcharge(e.target.value)}
              placeholder="0"
              className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Difficulty: {difficulty}/5</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 h-9 rounded-lg text-xs font-bold transition-colors select-none ${
                    difficulty === d ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground">
          {difficulty === 1 && "Easy — flat, small, no obstacles"}
          {difficulty === 2 && "Slightly challenging — minor slopes or obstacles"}
          {difficulty === 3 && "Average yard — normal terrain"}
          {difficulty === 4 && "Hard — hills, trees, tight spaces"}
          {difficulty === 5 && "Very hard — steep terrain, heavy debris, complex layout"}
        </p>

        {parseFloat(yardSize) > 0 && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Suggested Price</p>
            <p className="text-3xl font-bold text-primary neon-text">{formatCurrency(suggestedPrice)}</p>
            <div className="grid grid-cols-2 gap-2 mt-3 text-[10px] text-muted-foreground">
              <div>Rate: {formatCurrency(stats.avgRate)}/1k sqft</div>
              <div>Size: {sizeK.toFixed(1)}k sqft</div>
              <div>Services: ×{totalMult.toFixed(2)}</div>
              <div>Difficulty: ×{diffMult}</div>
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {formatCurrency(stats.avgRate)} × {sizeK.toFixed(1)}k × {totalMult.toFixed(2)} × {diffMult} {extra > 0 ? `+ ${formatCurrency(extra)}` : ""}
            </div>
          </div>
        )}

        {!stats.hasRateData && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground">
              No customers have yard sizes yet. Add a "Yard Size (sq ft)" to customer profiles and the calculator will use your actual per-sqft rates. Until then, a default of {formatCurrency(DEFAULT_RATE)} per 1,000 sq ft is used.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}