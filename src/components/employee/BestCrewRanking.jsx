import { Trophy } from "lucide-react";
import { formatCurrency } from "@/lib/lawnCare";

// Ranked leaderboard of helpers by how worth-it they are: worth % (money),
// minutes saved per yard, and total hours of your time freed up.
export default function BestCrewRanking({ rows = [], soloAvgMin, soloHourly }) {
  const ranked = rows
    .filter((r) => r.emp.active !== false && r.yards > 0)
    .map((r) => {
      const minSaved = soloAvgMin != null && r.avgMin != null ? soloAvgMin - r.avgMin : null;
      const hrsSaved = minSaved != null ? (minSaved * r.yards) / 60 : null;
      return { ...r, minSaved, hrsSaved };
    })
    .sort((a, b) => {
      if ((a.worthPct != null) !== (b.worthPct != null)) return a.worthPct != null ? -1 : 1;
      if (a.worthPct != null && b.worthPct != null) return b.worthPct - a.worthPct;
      return (b.ownerHourly ?? 0) - (a.ownerHourly ?? 0);
    });

  if (ranked.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">No timed helper yards yet — finish jobs with the timer running to see who's worth the most.</p>
      </div>
    );
  }

  const medals = ["🥇", "🥈", "🥉"];
  const best = ranked[0];

  return (
    <div>
      <h2 className="font-semibold mb-1 flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-400" /> Best Crew Ranking</h2>
      <p className="text-xs text-muted-foreground mb-4">
        {soloHourly != null
          ? `Ranked by worth % — how much your take-home $/hr improves vs working alone (${formatCurrency(soloHourly)}/hr).`
          : "Ranked by your take-home $/hr on their yards. Time some solo yards to unlock worth %."}
      </p>

      <div className="rounded-2xl border border-amber-500/50 bg-amber-500/5 p-4 mb-3">
        <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5" /> Best Hire: {best.emp.name}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {best.worthPct != null && `${best.worthPct >= 0 ? "+" : ""}${Math.round(best.worthPct)}% to your hourly take-home`}
          {best.minSaved != null && best.minSaved > 0 && ` · saves ~${Math.round(best.minSaved)} min per yard`}
          {best.hrsSaved != null && best.hrsSaved > 0 && soloHourly != null && ` · freed ${best.hrsSaved.toFixed(1)} hrs of your time (≈ ${formatCurrency(best.hrsSaved * soloHourly)})`}
        </p>
      </div>

      <div className="space-y-2">
        {ranked.map((r, i) => (
          <div key={r.emp.id} className={`flex items-center gap-3 rounded-xl border p-3 ${i === 0 ? "border-amber-500/50 bg-amber-500/5" : "border-border bg-card"}`}>
            <span className="w-8 text-center text-lg shrink-0">{medals[i] || `#${i + 1}`}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{r.emp.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {r.minSaved != null
                  ? r.minSaved >= 0
                    ? `saves ${Math.round(r.minSaved)} min/yard`
                    : `${Math.abs(Math.round(r.minSaved))} min slower/yard`
                  : "no timed comparison"}
                {r.hrsSaved != null && r.hrsSaved !== 0 && ` · ${Math.abs(r.hrsSaved).toFixed(1)} hrs ${r.hrsSaved > 0 ? "freed" : "added"}`}
              </p>
            </div>
            <div className="text-right shrink-0">
              {r.worthPct != null ? (
                <p className={`text-sm font-bold ${r.worthPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {r.worthPct >= 0 ? "+" : ""}{Math.round(r.worthPct)}%
                </p>
              ) : (
                <p className="text-sm font-bold text-primary">{r.ownerHourly != null ? `${formatCurrency(r.ownerHourly)}/hr` : "—"}</p>
              )}
              <p className="text-[10px] text-muted-foreground">{r.yards} yards</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}