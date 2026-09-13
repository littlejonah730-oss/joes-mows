import { Gift } from "lucide-react";

export default function RewardProgressBar({ progress = 0, goal = 10, onClaim, rewardName, rewardDescription }) {
  const pct = Math.min(100, (progress / (goal || 1)) * 100);
  const ready = progress >= goal;
  return (
    <div className="rounded-lg border border-border p-3">
      {rewardName && (
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Gift className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">Working toward: {rewardName}</p>
            {rewardDescription && <p className="text-[10px] text-muted-foreground truncate">{rewardDescription}</p>}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase">Reward Progress</p>
        <span className="text-xs font-bold text-primary">{progress}/{goal}</span>
      </div>
      <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${ready ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
      </div>
      {ready && onClaim && (
        <button onClick={onClaim} className="w-full mt-2 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90">
          🎁 Claim Reward
        </button>
      )}
    </div>
  );
}