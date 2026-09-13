// Manually-entered history for years before the app was in use.
// These seed the yearly growth chart + per-year stats and are added to
// all-time revenue. They are NOT used to project future growth.

export const HISTORICAL_YEARS = [
  {
    year: 2025,
    revenue: 3980,
    customers: 4,
    jobs: 76,
    note: "Only 4 customers in 2025: Ms. Wendland, Zackery Cain, Mimi, Bianca.",
  },
];

export const HISTORICAL_REVENUE = HISTORICAL_YEARS.reduce((s, y) => s + (y.revenue || 0), 0);

export function yearOf(d) {
  if (!d) return null;
  const date = typeof d === "string" && d.length === 10 ? new Date(d + "T00:00:00") : new Date(d);
  return date.getFullYear();
}