import { useMemo, useState } from "react";
import { TrendingUp, MapPin, Target } from "lucide-react";
import { formatCurrency } from "@/lib/lawnCare";
import { getSanAngeloNeighborhood as extractNeighborhood } from "@/lib/sanAngeloNeighborhoods";

export default function NeighborhoodGrowth({ customers = [], jobs = [] }) {
  const neighborhoods = useMemo(() => {
    const map = {};
    const completed = jobs.filter((j) => j.status === "completed");

    jobs.forEach((job) => {
      const addr = job.customer_address || customers.find((c) => c.id === job.customer_id)?.address;
      if (!addr) return;
      const nb = extractNeighborhood(addr);
      if (!map[nb]) {
        map[nb] = {
          name: nb,
          addresses: new Set(),
          customerIds: new Set(),
          totalRevenue: 0,
          jobCount: 0,
          completedCount: 0,
          recurringCount: 0,
        };
      }
      map[nb].addresses.add(addr);
      map[nb].customerIds.add(job.customer_id);
      map[nb].totalRevenue += job.price || 0;
      map[nb].jobCount++;
      if (job.status === "completed") map[nb].completedCount++;
      if (job.is_recurring || job.recurring_rule !== "one_time") map[nb].recurringCount++;
    });

    return Object.values(map).map((nb) => {
      const customerCount = nb.customerIds.size;
      const avgValue = nb.jobCount > 0 ? nb.totalRevenue / nb.jobCount : 0;
      const recurringRatio = nb.jobCount > 0 ? nb.recurringCount / nb.jobCount : 0;
      const growthScore = Math.round(
        (avgValue * 0.4) +
        (recurringRatio * 50 * 0.3) +
        (Math.min(customerCount, 10) * 3 * 0.3)
      );
      return {
        name: nb.name,
        customerCount,
        addressCount: nb.addresses.size,
        totalRevenue: nb.totalRevenue,
        jobCount: nb.jobCount,
        completedCount: nb.completedCount,
        recurringCount: nb.recurringCount,
        avgValue,
        growthScore: isNaN(growthScore) ? 0 : growthScore,
      };
    }).sort((a, b) => b.growthScore - a.growthScore);
  }, [customers, jobs]);

  const topGrowth = neighborhoods.slice(0, 5);

  return (
    <div>
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 mb-4">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-primary" />
          Growth suggestions based on customer density, avg job value, and recurring frequency. Target high-score areas to maximize revenue per stop.
        </p>
      </div>

      {neighborhoods.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MapPin className="w-10 h-10 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No neighborhood data yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Complete jobs with addresses to see growth suggestions.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {topGrowth.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-primary uppercase mb-2 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Top Growth Targets</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {topGrowth.map((nb, i) => (
                  <div key={nb.name} className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold truncate">{i + 1}. {nb.name}</p>
                      <span className="text-lg font-bold text-emerald-400">{nb.growthScore}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[11px]">
                      <span className="text-muted-foreground">Customers:</span><span className="font-medium">{nb.customerCount}</span>
                      <span className="text-muted-foreground">Avg $/Job:</span><span className="font-medium text-emerald-400">{formatCurrency(nb.avgValue)}</span>
                      <span className="text-muted-foreground">Recurring:</span><span className="font-medium">{nb.recurringCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {neighborhoods.map((nb) => {
              const color = nb.growthScore >= 40 ? "border-emerald-500/30 bg-emerald-500/5" : nb.growthScore >= 25 ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-card";
              return (
                <div key={nb.name} className={`rounded-xl border ${color} p-3 flex items-center gap-3`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{nb.name}</p>
                    <p className="text-[10px] text-muted-foreground">{nb.customerCount} customers · {nb.jobCount} jobs · {nb.recurringCount} recurring</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-emerald-400">{formatCurrency(nb.avgValue)}/job</p>
                    <p className="text-[10px] text-muted-foreground">Score: {nb.growthScore}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}