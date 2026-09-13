import { base44 } from "@/api/base44Client";

export const STATUS_CONFIG = {
  scheduled: { label: "Scheduled", color: "text-sky-400", bg: "bg-sky-500/10", dot: "bg-sky-400", hex: "#38bdf8" },
  in_progress: { label: "In Progress", color: "text-amber-400", bg: "bg-amber-500/10", dot: "bg-amber-400", hex: "#fbbf24" },
  completed: { label: "Completed", color: "text-emerald-400", bg: "bg-emerald-500/10", dot: "bg-emerald-400", hex: "#34d399" },
  cancelled: { label: "Cancelled", color: "text-red-400", bg: "bg-red-500/10", dot: "bg-red-400", hex: "#f87171" },
  paused: { label: "Paused", color: "text-purple-400", bg: "bg-purple-500/10", dot: "bg-purple-400", hex: "#a78bfa" },
};

export const PAYMENT_CONFIG = {
  cash: { label: "Cash", color: "text-emerald-400", bg: "bg-emerald-500/10", icon: "💵" },
  venmo: { label: "Venmo", color: "text-blue-400", bg: "bg-blue-500/10", icon: "🅥" },
  cashapp: { label: "CashApp", color: "text-green-400", bg: "bg-green-500/10", icon: "💲" },
  check: { label: "Check", color: "text-amber-400", bg: "bg-amber-500/10", icon: "📝" },
  none: { label: "Unpaid", color: "text-muted-foreground", bg: "bg-muted", icon: "⏳" },
};

export const RECURRING_CONFIG = {
  weekly: { label: "Weekly", interval: 7 },
  biweekly: { label: "Biweekly", interval: 14 },
  monthly: { label: "Monthly", interval: 30 },
  by_request: { label: "By Request", interval: 0 },
  one_time: { label: "One Time", interval: 0 },
};

export function formatCurrency(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);
}

export function formatDate(d) {
  if (!d) return "—";
  const date = typeof d === 'string' && d.length === 10 ? new Date(d + 'T00:00:00') : new Date(d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateShort(d) {
  if (!d) return "—";
  const date = typeof d === 'string' && d.length === 10 ? new Date(d + 'T00:00:00') : new Date(d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatDayOfWeek(d) {
  if (!d) return "";
  const date = typeof d === 'string' && d.length === 10 ? new Date(d + 'T00:00:00') : new Date(d);
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

export function formatTime(d) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function formatDateTime(d) {
  if (!d) return "—";
  return `${formatDate(d)} · ${formatTime(d)}`;
}

export function isToday(d) {
  const date = typeof d === 'string' && d.length === 10 ? new Date(d + 'T00:00:00') : new Date(d);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

export function isFuture(d) {
  const date = typeof d === 'string' && d.length === 10 ? new Date(d + 'T00:00:00') : new Date(d);
  return date > new Date();
}

export function isPast(d) {
  const date = typeof d === 'string' && d.length === 10 ? new Date(d + 'T00:00:00') : new Date(d);
  return date < new Date() && !isToday(d);
}

export function isOverdue(invoice) {
  if (invoice.status === "paid") return false;
  if (!invoice.due_date) return false;
  const date = typeof invoice.due_date === 'string' && invoice.due_date.length === 10 ? new Date(invoice.due_date + 'T00:00:00') : new Date(invoice.due_date);
  return date < new Date();
}

export function getNextRecurringDate(currentDate, rule) {
  const date = new Date(currentDate);
  const intervals = RECURRING_CONFIG[rule];
  if (!intervals || intervals.interval === 0) return null;
  date.setDate(date.getDate() + intervals.interval);
  return date.toISOString();
}

export function getJobTimeFrame(dateStr) {
  if (isPast(dateStr)) return "past";
  if (isToday(dateStr)) return "present";
  return "future";
}

export const ROLE_CONFIG = {
  greenhorn: { label: "Greenhorn", color: "text-blue-400", bg: "bg-blue-500/10", canSolo: false, description: "Entry-level. Assists only, learning the basics." },
  groundsman: { label: "Groundsman", color: "text-sky-400", bg: "bg-sky-500/10", canSolo: false, description: "Helper who handles basic tasks and assists operators." },
  operator: { label: "Operator", color: "text-teal-400", bg: "bg-teal-500/10", canSolo: true, description: "Trusted worker who can run simple jobs solo." },
  foreman: { label: "Foreman", color: "text-amber-400", bg: "bg-amber-500/10", canSolo: true, description: "Runs full jobs, manages helpers, ensures quality." },
  specialist: { label: "Specialist", color: "text-purple-400", bg: "bg-purple-500/10", canSolo: true, description: "Expert in advanced services — irrigation, hardscaping, design." },
};

export const PROMOTION_PATH = {
  greenhorn: "groundsman",
  groundsman: "operator",
  operator: "foreman",
  foreman: "specialist",
};

// Jobs completed required to auto-promote to the next role.
export const PROMOTION_THRESHOLDS = {
  greenhorn: 3,
  groundsman: 10,
  operator: 25,
  foreman: 50,
};

export const ASSIGNMENT_CONFIG = {
  solo: { label: "Solo", color: "text-amber-400", bg: "bg-amber-500/20" },
  helping: { label: "Helping", color: "text-primary", bg: "bg-primary/10" },
  urgent: { label: "Urgent", color: "text-red-400", bg: "bg-red-500/20" },
};

export const MULCH_CONFIG = {
  mulched: { label: "Mulched", icon: "🌾" },
  bagged: { label: "Bagged", icon: "🥡" },
  flush_chuted: { label: "Flush Chuted", icon: "🕳️" },
};

// Crew size: owner (1) + a helper if an employee is signed up / assigned / flagged.
export function getJobCrewSize(job) {
  let size = 1;
  const hasHelper = job.claimed_by_employee_id || job.exclusive_to_employee_id || job.needs_help || job.employee_assignment === "helping" || job.employee_assignment === "urgent";
  if (hasHelper) size += 1;
  return size;
}

// Raw wall-clock seconds from the timer / manual entry. Used for $/hr, worth %,
// and labor-hour metrics — no crew scaling (just the time you put in).
export function getJobCrewSeconds(job) {
  return job.timer_duration_seconds || 0;
}

// Jobs an employee has actually completed (claimed or exclusively assigned to them).
export function jobsDoneByEmployee(jobs, empId) {
  if (!empId) return [];
  return (jobs || []).filter((j) => j.status === "completed" && (j.claimed_by_employee_id === empId || j.exclusive_to_employee_id === empId));
}

// What an employee earns on a job — uses a per-job override if set,
// otherwise the standard solo/urgent (65%) or helping (40%) cut of the job price.
export function getJobEmployeePay(job) {
  const override = Number(job.custom_employee_pay);
  if (job.custom_employee_pay != null && job.custom_employee_pay !== "" && !Number.isNaN(override)) return override;
  const assignment = job.employee_assignment || "helping";
  const rate = assignment === "solo" || assignment === "urgent" ? 0.65 : 0.40;
  return (job.price || 0) * rate;
}

// True when a job has a custom (non-percentage) pay amount set.
export function hasCustomPay(job) {
  return job.custom_employee_pay != null && job.custom_employee_pay !== "";
}

// NOTE: The alternating A/B week-route grouping has been removed per request.

// The reward tier an employee is currently working toward — the first tier
// above their progress, so the goal automatically advances to the next tier
// as soon as the current one is reached (e.g. 13 yards → chasing the 20-yard tier).
export function getTargetReward(rewards = [], progress = 0) {
  const sorted = [...rewards].filter(Boolean).sort((a, b) => (a.jobs_required || 0) - (b.jobs_required || 0));
  if (sorted.length === 0) return null;
  return sorted.find((r) => (r.jobs_required || 0) > progress) || sorted[sorted.length - 1];
}

// Effective reward progress — whichever is higher, the tracked reward progress
// or the total yards count, so manual yard adjustments count toward rewards too.
export function getRewardProgress(employee) {
  if (!employee) return 0;
  return Math.max(employee.reward_progress ?? 0, employee.yards_completed ?? 0);
}