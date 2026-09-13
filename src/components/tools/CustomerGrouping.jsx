import { useMemo } from "react";
import { Link } from "react-router-dom";
import { DollarSign, Phone } from "lucide-react";
import { formatCurrency } from "@/lib/lawnCare";

function getCustomerHourlyRate(custId, jobs) {
  const timed = jobs.filter((j) => j.customer_id === custId && j.status === "completed" && j.timer_duration_seconds > 0);
  if (timed.length === 0) return null;
  const rates = timed.map((j) => (j.price || 0) / (j.timer_duration_seconds / 3600));
  return rates.reduce((s, r) => s + r, 0) / rates.length;
}

function CustomerRow({ customer: c }) {
  const digits = c.phone ? c.phone.replace(/\D/g, "") : "";
  return (
    <div className="rounded-lg bg-muted/30 p-2">
      <div className="flex items-center justify-between gap-1">
        <Link to={`/customers/${c.id}`} className="text-[11px] font-medium hover:text-primary transition-colors block truncate flex-1">
          {c.name}
        </Link>
        {c._worth !== null && c._worth !== undefined && (
          <span className={`text-[10px] font-bold shrink-0 ${c._worth >= 100 ? "text-emerald-400" : c._worth >= 70 ? "text-primary" : c._worth >= 40 ? "text-amber-400" : "text-red-400"}`}>
            {c._worth}%
          </span>
        )}
      </div>
      {c.address && <p className="text-[10px] text-muted-foreground truncate">{c.address}</p>}
      {c.phone && (
        <a href={`tel:${digits}`} className="text-[10px] text-primary hover:underline flex items-center gap-1 mt-0.5">
          <Phone className="w-2.5 h-2.5" /> {c.phone}
        </a>
      )}
    </div>
  );
}

const VALUE_TIERS = [
  { key: "High Value ($50+/hr)", min: 50, color: "border-emerald-500/30 bg-emerald-500/5" },
  { key: "Mid Value ($30-50/hr)", min: 30, color: "border-amber-500/30 bg-amber-500/5" },
  { key: "Low Value (<$30/hr)", min: 0, color: "border-red-500/30 bg-red-500/5" },
  { key: "No Timer Data", min: null, color: "border-border bg-card" },
];

export default function CustomerGrouping({ customers = [], jobs = [] }) {
  const groups = useMemo(() => {
    const map = {};
    const completed = jobs.filter((j) => j.status === "completed");

    // Calculate company-wide average $/hr from all timed jobs
    const allTimed = completed.filter((j) => j.timer_duration_seconds > 0);
    const timedRevenue = allTimed.reduce((s, j) => s + (j.price || 0), 0);
    const timedSeconds = allTimed.reduce((s, j) => s + j.timer_duration_seconds, 0);
    const avgDollarPerHour = timedSeconds > 0 ? timedRevenue / (timedSeconds / 3600) : 0;

    function calcWorth(cust, hourlyRate) {
      if (hourlyRate === null || avgDollarPerHour === 0) return null;
      const baseWorth = (hourlyRate / avgDollarPerHour) * 100;
      const bagging = cust.mulch_type === "bagged";
      const baggingPenalty = bagging ? (hourlyRate < avgDollarPerHour ? 20 : 5) : 0;
      const worth = baseWorth - baggingPenalty;
      return Math.min(100, Math.round(worth));
    }

    customers.forEach((cust) => {
      const custJobs = jobs.filter((j) => j.customer_id === cust.id);
      const custCompleted = completed.filter((j) => j.customer_id === cust.id);
      const revenue = custCompleted.reduce((s, j) => s + (j.price || 0), 0);
      const hourlyRate = getCustomerHourlyRate(cust.id, jobs);
      const worth = calcWorth(cust, hourlyRate);

      let key;
      if (hourlyRate === null) key = "No Timer Data";
      else if (hourlyRate >= 50) key = "High Value ($50+/hr)";
      else if (hourlyRate >= 30) key = "Mid Value ($30-50/hr)";
      else key = "Low Value (<$30/hr)";

      if (!map[key]) map[key] = { key, customers: [], totalRevenue: 0, jobCount: 0, hourlyRates: [], worthValues: [] };
      map[key].customers.push({ ...cust, _worth: worth });
      map[key].totalRevenue += revenue;
      map[key].jobCount += custJobs.length;
      if (hourlyRate !== null) map[key].hourlyRates.push(hourlyRate);
      if (worth !== null) map[key].worthValues.push(worth);
    });

    return VALUE_TIERS.map((tier) => {
      const g = map[tier.key];
      if (!g) return null;
      return {
        ...g,
        color: tier.color,
        avgHourlyRate: g.hourlyRates.length > 0 ? g.hourlyRates.reduce((s, r) => s + r, 0) / g.hourlyRates.length : null,
        avgWorth: g.worthValues.length > 0 ? Math.round(g.worthValues.reduce((s, w) => s + w, 0) / g.worthValues.length) : null,
      };
    }).filter(Boolean);
  }, [customers, jobs]);

  return (
    <div>
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No customers to group yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {groups.map((group) => (
            <div key={group.key} className={`rounded-xl border ${group.color} p-4`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold truncate flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-primary" /> {group.key}</p>
                <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">{group.customers.length}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div className="text-center p-1.5 rounded-lg bg-muted/40">
                  <p className="text-[9px] text-muted-foreground uppercase">Revenue</p>
                  <p className="text-sm font-bold text-emerald-400">{formatCurrency(group.totalRevenue)}</p>
                </div>
                <div className="text-center p-1.5 rounded-lg bg-muted/40">
                  <p className="text-[9px] text-muted-foreground uppercase">Avg $/hr</p>
                  <p className="text-sm font-bold text-primary">{group.avgHourlyRate !== null ? `${formatCurrency(group.avgHourlyRate)}` : "—"}</p>
                </div>
                <div className="text-center p-1.5 rounded-lg bg-muted/40">
                  <p className="text-[9px] text-muted-foreground uppercase">Avg Worth</p>
                  <p className="text-sm font-bold text-emerald-400">{group.avgWorth !== null ? `${group.avgWorth}%` : "—"}</p>
                </div>
              </div>
              <div className="space-y-1">
                {group.customers.map((c) => (
                  <CustomerRow key={c.id} customer={c} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}