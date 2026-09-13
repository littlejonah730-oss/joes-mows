import { Award, Lock } from "lucide-react";
import { hasEmployeeEarnedBadge, getBadgeProgress, CRITERIA_LABELS, COLOR_STYLES } from "@/lib/badgeUtils";

export default function EmployeeBadges({ employee, jobs, badges, assignments = [] }) {
  if (!employee || !badges || badges.length === 0) return null;

  const badgeStatus = badges.map(badge => {
    const autoEarned = hasEmployeeEarnedBadge(employee.id, badge, jobs, [employee]);
    const manualEarned = assignments.some(a => a.badge_id === badge.id && a.employee_id === employee.id);
    const earned = autoEarned || manualEarned;
    const progress = getBadgeProgress(employee.id, badge, jobs, [employee]);
    return { badge, earned, progress, manual: manualEarned && !autoEarned };
  });

  const earnedCount = badgeStatus.filter(b => b.earned).length;

  badgeStatus.sort((a, b) => {
    if (a.earned && !b.earned) return -1;
    if (!a.earned && b.earned) return 1;
    return b.progress.percent - a.progress.percent;
  });

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Award className="w-3.5 h-3.5" /> Achievements
        </h2>
        <span className="text-xs font-bold text-primary">{earnedCount}/{badges.length}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {badgeStatus.map(({ badge, earned, progress, manual }) => (
          <div key={badge.id} className={`rounded-xl border p-3 transition-all ${earned ? `${COLOR_STYLES[badge.color] || COLOR_STYLES.emerald} neon-glow` : "border-border bg-muted/20 opacity-60"}`}>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-2xl ${earned ? "" : "grayscale opacity-40"}`}>{earned ? (badge.icon || "🏆") : <Lock className="w-5 h-5 text-muted-foreground" />}</span>
            </div>
            <p className={`text-xs font-bold truncate ${earned ? "" : "text-muted-foreground"}`}>{badge.name}</p>
            {earned ? (
              <p className="text-[10px] text-emerald-400 font-medium mt-0.5">{manual ? "★ Awarded" : "✓ Earned!"}</p>
            ) : (
              <>
                <p className="text-[9px] text-muted-foreground mt-0.5 line-clamp-2">{badge.description || CRITERIA_LABELS[badge.criteria_type]}</p>
                <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${progress.percent}%` }} />
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  {badge.criteria_type === "job_value_avg" || badge.criteria_type === "on_time_percent"
                    ? `${progress.currentValue.toFixed(0)}/${progress.target}`
                    : `${Math.floor(progress.currentValue)}/${progress.target}`}
                </p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}