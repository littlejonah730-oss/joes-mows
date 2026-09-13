// Maintenance checklists per equipment type, with per-item overrides matched
// by name/model. Usage counts come from real EquipmentUsage records (jobs
// since the task was last done) — hours_used is never used.

const DAY_MS = 86400000;

const MOWER_TASKS = [
  { id: "oil_air_filter", label: "Oil change + air filter check", everyJobs: 25 },
  { id: "blade_sharpen", label: "Blade sharpening", everyJobs: 20 },
  { id: "spark_plug", label: "Spark plug (once a year)", everyDays: 365 },
];

const TRIMMER_TASKS = [
  { id: "air_filter", label: "Air filter check", everyJobs: 10 },
  { id: "spark_plug", label: "Spark plug (once a year)", everyDays: 365 },
  { id: "fuel_carb", label: "Fuel system / carb inspection (2-stroke, once a season)", seasonal: true },
];

const HEDGE_TASKS = [
  { id: "gearbox_grease", label: "Gearbox grease", everyJobs: 25 },
  { id: "blade_season", label: "Blade sharpening (once a season)", seasonal: true },
];

const BLOWER_TASKS = [
  { id: "air_filter", label: "Air filter check", everyJobs: 10 },
  { id: "spark_plug", label: "Spark plug (once a year)", everyDays: 365 },
  { id: "fuel_carb", label: "Fuel line / carb inspection (once a season)", seasonal: true },
];

const TRAILER_TASKS = [
  { id: "tire_pressure", label: "Tire pressure check (monthly)", everyDays: 30 },
  { id: "wheel_bearings", label: "Wheel bearing check (every 6 months)", everyDays: 180 },
  { id: "lights_wiring", label: "Lights & wiring check (quarterly)", everyDays: 90 },
  { id: "hitch_coupler", label: "Hitch & coupler check (quarterly)", everyDays: 90 },
];

// Returns the checklist for a specific equipment item.
export function getChecklist(eq) {
  const name = `${eq.name || ""} ${eq.model || ""}`.toLowerCase();
  if (name.includes("trailer")) return TRAILER_TASKS;
  if (name.includes("dh212") || name.includes("shindaiwa") || name.includes("hedge")) return HEDGE_TASKS;
  if (eq.type === "trimmer") return TRIMMER_TASKS;
  if (eq.type === "blower") return BLOWER_TASKS;
  return MOWER_TASKS;
}

const cmpDate = (d) => String(d || "").slice(0, 10);

function parseState(eq) {
  try {
    return eq.maintenance_state ? JSON.parse(eq.maintenance_state) : {};
  } catch (e) {
    return {};
  }
}

// Computes the status of one task for one equipment item.
// usageRecords = the item's EquipmentUsage records.
export function getTaskStatus(eq, task, usageRecords, today = new Date()) {
  const state = parseState(eq);
  const lastDone = (state[task.id] && state[task.id].date) || eq.last_serviced_date || null;
  const jobsSince = usageRecords.filter((u) => !lastDone || cmpDate(u.job_date) > cmpDate(lastDone)).length;

  if (task.everyJobs) {
    return {
      task,
      lastDone,
      jobsSince,
      seasonal: false,
      due: jobsSince >= task.everyJobs,
      overdueJobs: jobsSince - task.everyJobs,
      overdueDays: null,
      progress: Math.min(1, jobsSince / task.everyJobs),
    };
  }

  const daysSince = lastDone
    ? Math.floor((new Date(cmpDate(today) + "T00:00:00") - new Date(cmpDate(lastDone) + "T00:00:00")) / DAY_MS)
    : null;

  if (task.everyDays) {
    const due = daysSince == null ? true : daysSince >= task.everyDays;
    return {
      task,
      lastDone,
      jobsSince,
      seasonal: false,
      due,
      overdueJobs: null,
      overdueDays: due && daysSince != null ? daysSince - task.everyDays : null,
      progress: daysSince == null ? 1 : Math.min(1, daysSince / task.everyDays),
    };
  }

  // Seasonal task: due once the calendar season changes since last done.
  const seasonIdx = (iso) => Math.floor(new Date(cmpDate(iso) + "T00:00:00").getMonth() / 3);
  const due = lastDone == null ? true : seasonIdx(lastDone) !== Math.floor(today.getMonth() / 3);
  return { task, lastDone, jobsSince, seasonal: true, due, overdueJobs: null, overdueDays: daysSince, progress: null };
}

export function getDueTasks(eq, usageRecords, today = new Date()) {
  return getChecklist(eq).map((t) => getTaskStatus(eq, t, usageRecords, today)).filter((s) => s.due);
}