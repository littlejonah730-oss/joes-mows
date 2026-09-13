import { createNotificationOnce } from "./notify.ts";
import { pushToOwnerSubs, pushToSubs } from "./push.ts";

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

// Shared engine for the 6am "jobs today" and 8pm "jobs tomorrow" alerts.
// Owner gets full detail incl. prices; each employee gets only their own
// claimed/exclusive jobs with no pay info; schedule viewers get a summary.
export async function sendScheduleAlert(b, label) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(today);
  if (label === "tomorrow") target.setDate(target.getDate() + 1);
  const dateStr = isoDate(target);
  const type = label === "tomorrow" ? "jobs_tomorrow" : "jobs_today";

  const jobs = await b.entities.Job.list("-scheduled_date", 2000);
  const dayJobs = jobs.filter(
    (j) => String(j.scheduled_date || "").slice(0, 10) === dateStr && ["scheduled", "in_progress"].includes(j.status)
  );

  if (dayJobs.length === 0) {
    return { ok: true, label, jobs: 0 };
  }

  const revenue = dayJobs.reduce((s, j) => s + (j.price || 0), 0);
  const ownerLines = dayJobs.map(
    (j) => `${j.customer_name} — $${(j.price || 0).toFixed(2)}${j.claimed_by_name ? ` (${j.claimed_by_name})` : ""}`
  );
  const ownerTitle = `${dayJobs.length} job${dayJobs.length === 1 ? "" : "s"} ${label} — $${revenue.toFixed(0)} expected`;

  await createNotificationOnce(b, {
    type,
    title: ownerTitle,
    body: ownerLines.slice(0, 10).join("\n") + (dayJobs.length > 10 ? `\n+${dayJobs.length - 10} more` : ""),
    severity: "info",
    dedup_key: `${type}_${dateStr}`,
    link: "/jobs",
  });

  // Owner phones: full detail with prices
  await pushToOwnerSubs(b, {
    type,
    title: ownerTitle,
    body: ownerLines.slice(0, 6).join(" · ") + (dayJobs.length > 6 ? ` · +${dayJobs.length - 6} more` : ""),
    link: "/jobs",
  });

  // Employee + viewer phones: no pay info anywhere
  const subs = await b.entities.PushSubscription.list("-created_date", 500);
  const others = (subs || []).filter((s) => !s.is_admin);
  const byEmployee = {};
  const spectators = [];
  others.forEach((s) => {
    if (!s.employee_id) { spectators.push(s); return; }
    const mine = dayJobs.filter(
      (j) => j.claimed_by_employee_id === s.employee_id || j.exclusive_to_employee_id === s.employee_id
    );
    if (mine.length === 0) return;
    if (!byEmployee[s.employee_id]) {
      byEmployee[s.employee_id] = { names: mine.map((j) => j.customer_name), subs: [] };
    }
    byEmployee[s.employee_id].subs.push(s);
  });

  for (const empId of Object.keys(byEmployee)) {
    const group = byEmployee[empId];
    await pushToSubs(b, {
      type,
      title: `Your jobs ${label} (${group.names.length})`,
      body: group.names.join(", ").slice(0, 300),
      link: "/",
    }, group.subs);
  }

  if (spectators.length > 0) {
    await pushToSubs(b, {
      type,
      title: `${dayJobs.length} jobs ${label}`,
      body: dayJobs.map((j) => j.customer_name).join(", ").slice(0, 300),
      link: "/calendar",
    }, spectators);
  }

  return { ok: true, label, jobs: dayJobs.length, revenue };
}