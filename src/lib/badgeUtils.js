export const CRITERIA_LABELS = {
  total_jobs: "Total Jobs Completed",
  mowing_count: "Mowing Jobs",
  leaf_count: "Leaf Removal Jobs",
  cleanup_count: "Cleanup Jobs",
  on_time_percent: "On-Time %",
  job_value_avg: "Avg Job Value ($/hr)",
  reliability_score: "Reliability Score"
};

export const COLOR_STYLES = {
  emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  amber: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  blue: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  purple: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  red: "bg-red-500/10 text-red-400 border-red-500/30"
};

export function getEmployeeBadgeStats(empId, jobs, employees) {
  const empJobs = jobs.filter(j => j.claimed_by_employee_id === empId && j.status === "completed");
  const totalJobs = empJobs.length;
  const mowingCount = empJobs.filter(j => (j.job_type || "").toLowerCase().includes("mow")).length;
  const leafCount = empJobs.filter(j => (j.job_type || "").toLowerCase().includes("leaf")).length;
  const cleanupCount = empJobs.filter(j => (j.job_type || "").toLowerCase().includes("clean")).length;
  const onTimeJobs = empJobs.filter(j => j.timer_started_at).length;
  const onTimePercent = totalJobs > 0 ? (onTimeJobs / totalJobs) * 100 : 0;
  const timed = empJobs.filter(j => j.timer_duration_seconds > 0);
  const avgValue = timed.length > 0
    ? timed.reduce((s, j) => s + ((j.price || 0) / (j.timer_duration_seconds / 3600)), 0) / timed.length
    : 0;
  const emp = employees.find(e => e.id === empId);
  const reliability = emp?.reliability_score ?? 100;
  return { totalJobs, mowingCount, leafCount, cleanupCount, onTimePercent, avgValue, reliability };
}

export function hasEmployeeEarnedBadge(empId, badge, jobs, employees) {
  const stats = getEmployeeBadgeStats(empId, jobs, employees);
  switch (badge.criteria_type) {
    case "total_jobs": return stats.totalJobs >= badge.criteria_threshold;
    case "mowing_count": return stats.mowingCount >= badge.criteria_threshold;
    case "leaf_count": return stats.leafCount >= badge.criteria_threshold;
    case "cleanup_count": return stats.cleanupCount >= badge.criteria_threshold;
    case "on_time_percent": return stats.onTimePercent >= badge.criteria_threshold;
    case "job_value_avg": return stats.avgValue >= badge.criteria_threshold;
    case "reliability_score": return stats.reliability >= badge.criteria_threshold;
    default: return false;
  }
}

export function getBadgeProgress(empId, badge, jobs, employees) {
  const stats = getEmployeeBadgeStats(empId, jobs, employees);
  let currentValue = 0;
  switch (badge.criteria_type) {
    case "total_jobs": currentValue = stats.totalJobs; break;
    case "mowing_count": currentValue = stats.mowingCount; break;
    case "leaf_count": currentValue = stats.leafCount; break;
    case "cleanup_count": currentValue = stats.cleanupCount; break;
    case "on_time_percent": currentValue = stats.onTimePercent; break;
    case "job_value_avg": currentValue = stats.avgValue; break;
    case "reliability_score": currentValue = stats.reliability; break;
  }
  return {
    currentValue,
    target: badge.criteria_threshold,
    percent: Math.min(100, badge.criteria_threshold > 0 ? (currentValue / badge.criteria_threshold) * 100 : 0)
  };
}