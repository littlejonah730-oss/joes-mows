const STAFFING_TIERS = [
  {
    yards: "10–20 yards",
    employees: "1 employee",
    mowers: "1 mower",
    trimmers: "1 trimmer",
    blowers: "1 blower",
    notes: "Light workload; easy for a solo operator.",
    equipment: "1 mower, 1 trimmer, 1 blower, 1 power mower deck",
  },
  {
    yards: "20–35 yards",
    employees: "1 employee (busy)",
    mowers: "1–2 mowers",
    trimmers: "1 trimmer",
    blowers: "1 blower",
    notes: "Manageable but long days; heat becomes a factor.",
    equipment: "1–2 mowers, 1 trimmer, 1 blower, backup mower for breakdowns",
  },
  {
    yards: "35–50 yards",
    employees: "2 employees",
    mowers: "2 mowers",
    trimmers: "1–2 trimmers",
    blowers: "1–2 blowers",
    notes: "Ideal split: one mower lead + one trimmer/blower.",
    equipment: "2 mowers, 1–2 trimmers, 1–2 blowers, 2 mower decks",
  },
  {
    yards: "50–70 yards",
    employees: "2–3 employees",
    mowers: "2 mowers",
    trimmers: "2 trimmers",
    blowers: "2 blowers",
    notes: "Depends on yard size and drive time.",
    equipment: "2 mowers, 2 trimmers, 2 blowers, 2 mower decks, 1 backup mower",
  },
  {
    yards: "70–100 yards",
    employees: "3–4 employees",
    mowers: "2–3 mowers",
    trimmers: "2–3 trimmers",
    blowers: "2 blowers",
    notes: "Small crew with efficient routing.",
    equipment: "2–3 mowers, 2–3 trimmers, 2 blowers, 3 mower decks, 1 backup mower",
  },
  {
    yards: "100–150 yards",
    employees: "4–5 employees",
    mowers: "3–4 mowers",
    trimmers: "3 trimmers",
    blowers: "2–3 blowers",
    notes: "Requires tight scheduling and reliable equipment.",
    equipment: "3–4 mowers, 3 trimmers, 2–3 blowers, 4 mower decks, 2 trucks",
  },
  {
    yards: "150+ yards",
    employees: "6+ employees",
    mowers: "4+ mowers",
    trimmers: "3–4 trimmers",
    blowers: "3+ blowers",
    notes: "Full crew operation; consider multiple trucks.",
    equipment: "4+ mowers, 3–4 trimmers, 3+ blowers, 5+ mower decks, 2+ trucks, dedicated equipment manager",
  },
];

export default function StaffingRatio({ customers = [], employees = [] }) {
  const activeYards = customers.filter((c) => c.active).length;
  const activeEmployees = employees.filter((e) => e.active !== false).length;

  const currentTier = STAFFING_TIERS.find((t) => {
    const min = parseInt(t.yards);
    if (t.yards.includes("+")) return activeYards >= min;
    const max = parseInt(t.yards.split("–")[1]);
    return activeYards >= min && activeYards <= max;
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
          <p className="text-2xl font-bold text-primary">{activeYards}</p>
          <p className="text-[10px] text-muted-foreground">Active Yards</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-blue-400">{activeEmployees}</p>
          <p className="text-[10px] text-muted-foreground">Current Staff</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-sm font-bold text-emerald-400 leading-tight">{currentTier?.employees || "—"}</p>
          <p className="text-[10px] text-muted-foreground">Recommended for your yard count</p>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-thin -mx-1 px-1">
        <table className="w-full text-xs min-w-[700px]">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 font-semibold text-muted-foreground whitespace-nowrap">Yards per Week</th>
              <th className="text-left py-2 px-2 font-semibold text-muted-foreground whitespace-nowrap">Recommended Employees</th>
              <th className="text-left py-2 px-2 font-semibold text-muted-foreground whitespace-nowrap">Mowers</th>
              <th className="text-left py-2 px-2 font-semibold text-muted-foreground whitespace-nowrap">Trim/Weedeaters</th>
              <th className="text-left py-2 px-2 font-semibold text-muted-foreground whitespace-nowrap">Blowers</th>
              <th className="text-left py-2 px-2 font-semibold text-muted-foreground">Notes</th>
            </tr>
          </thead>
          <tbody>
            {STAFFING_TIERS.map((tier, i) => {
              const isCurrent = tier === currentTier;
              return (
                <tr
                  key={i}
                  className={`border-b border-border/50 transition-colors ${
                    isCurrent ? "bg-primary/10" : "hover:bg-muted/30"
                  }`}
                >
                  <td className="py-2.5 px-2 font-medium whitespace-nowrap">{tier.yards}</td>
                  <td className="py-2.5 px-2 whitespace-nowrap">
                    <span className={isCurrent ? "text-primary font-semibold" : ""}>{tier.employees}</span>
                  </td>
                  <td className="py-2.5 px-2 text-muted-foreground whitespace-nowrap">{tier.mowers}</td>
                  <td className="py-2.5 px-2 text-muted-foreground whitespace-nowrap">{tier.trimmers}</td>
                  <td className="py-2.5 px-2 text-muted-foreground whitespace-nowrap">{tier.blowers}</td>
                  <td className="py-2.5 px-2 text-muted-foreground">{tier.notes}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {currentTier && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs font-medium text-primary mb-1">Your current tier: {currentTier.yards}</p>
          <p className="text-[11px] text-muted-foreground">{currentTier.employees} recommended — {currentTier.mowers}, {currentTier.trimmers}, {currentTier.blowers}</p>
        </div>
      )}
    </div>
  );
}