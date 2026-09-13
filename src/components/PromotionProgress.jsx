import { ROLE_CONFIG, PROMOTION_PATH, PROMOTION_THRESHOLDS } from "@/lib/lawnCare";
import { TrendingUp, ChevronRight } from "lucide-react";

const LADDER = ["greenhorn", "groundsman", "operator", "foreman", "specialist"];

export default function PromotionProgress() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 mb-6">
      <h2 className="font-semibold mb-1 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Promotion Ladder</h2>
      <p className="text-xs text-muted-foreground mb-4">How many completed jobs an employee needs to auto-promote to the next rank. Just for reference.</p>
      <div className="space-y-2">
        {LADDER.map((role) => {
          const cfg = ROLE_CONFIG[role];
          const next = PROMOTION_PATH[role];
          const threshold = PROMOTION_THRESHOLDS[role];
          return (
            <div key={role} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <span className={`text-xs font-bold px-2 py-1 rounded ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
              {next ? (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <span className="text-lg font-bold text-primary">{threshold}</span>
                  <span className="text-[10px]">jobs</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
                  <span className={`text-xs font-semibold ${ROLE_CONFIG[next].color}`}>{ROLE_CONFIG[next].label}</span>
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Top Rank</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}