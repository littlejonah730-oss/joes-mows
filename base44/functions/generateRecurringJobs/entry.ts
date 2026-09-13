import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { notifyAndPush } from '../../shared/notify.ts';

// How many upcoming occurrences to keep on the calendar per recurring series
const OCCURRENCES = { weekly: 8, biweekly: 8, monthly: 3 };

function parseDate(s) {
  return new Date((typeof s === "string" && s.length === 10 ? s : s?.slice(0, 10)) + "T00:00:00");
}
function toISO(d) {
  return d.toISOString().slice(0, 10);
}
function stepDate(d, rule) {
  const n = new Date(d);
  if (rule === "weekly") n.setDate(n.getDate() + 7);
  else if (rule === "biweekly") n.setDate(n.getDate() + 14);
  else n.setMonth(n.getMonth() + 1);
  return n;
}

// Mowing season: March 1 – October 31. No recurring jobs are scheduled Nov–Feb;
// the series picks back up in March.
function inSeason(d) {
  const m = d.getMonth();
  return m >= 2 && m <= 9;
}
// A "season year" runs Mar–Oct (Nov–Feb belong to the season that already ended).
function seasonYear(d) {
  return d.getMonth() >= 2 ? d.getFullYear() : d.getFullYear() - 1;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user || user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
    const b = base44.asServiceRole;

    const [customers, jobs, settingsList] = await Promise.all([
      b.entities.Customer.list("-created_date", 1000),
      b.entities.Job.list("-scheduled_date", 2000),
      b.entities.BusinessSettings.list("-created_date", 5),
    ]);
    const settings = settingsList?.[0] || {};

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const seasonActive = inSeason(today); // during Nov–Feb, recurring generation pauses entirely

    let created = 0;
    const details = [];

    for (const c of customers) {
      const rule = c.recurring_rule;
      if (!seasonActive || c.active === false || !c.is_recurring || !OCCURRENCES[rule]) continue;

      const custJobs = jobs.filter((j) => j.customer_id === c.id && j.recurring_rule === rule);
      if (custJobs.length === 0) continue;

      const sorted = [...custJobs].sort((a, z) => parseDate(a.scheduled_date) - parseDate(z.scheduled_date));
      const existingDates = new Set(sorted.map((j) => toISO(parseDate(j.scheduled_date))));

      // Rolling window: keep N workable upcoming occurrences from today forward.
      // A cancelled or paused single occurrence stays skipped — the series continues.
      const upcomingCount = sorted.filter(
        (j) => parseDate(j.scheduled_date) >= today && !["cancelled", "paused"].includes(j.status)
      ).length;

      let cursor = parseDate(sorted[sorted.length - 1].scheduled_date);
      let made = 0;
      let guard = 0;
      while (upcomingCount + made < OCCURRENCES[rule] && guard < 120) {
        cursor = stepDate(cursor, rule);
        guard++;
        if (cursor < today) continue; // never back-fill missed dates
        if (!inSeason(cursor)) continue; // off-season date (Nov–Feb): skipped, series resumes in March
        if (seasonYear(cursor) > seasonYear(today)) break; // next season's jobs wait until spring
        const dateStr = toISO(cursor);
        if (existingDates.has(dateStr)) continue; // skipped occurrence stays skipped

        await b.entities.Job.create({
          customer_id: c.id,
          customer_name: c.name,
          customer_address: c.address || "",
          scheduled_date: dateStr,
          status: "scheduled",
          price: latestPrice(sorted, c, settings),
          job_type: custJobs[custJobs.length - 1].job_type || "Mow",
          service_line: custJobs[custJobs.length - 1].service_line || "mowing",
          notes: custJobs[custJobs.length - 1].notes || "",
          recurring_rule: rule,
          is_recurring: true,
          difficulty: custJobs[custJobs.length - 1].difficulty || 3,
          auto_generated: true,
        });
        existingDates.add(dateStr);
        made++;
        created++;
      }
      if (made > 0) details.push(`${c.name}: ${made}`);
    }

    if (created > 0) {
      await notifyAndPush(b, {
        type: "recurring_generated",
        title: `${created} recurring job${created === 1 ? "" : "s"} auto-scheduled`,
        body: details.slice(0, 6).join(" · "),
        severity: "success",
        dedup_key: `recur_${toISO(today)}`,
        link: "/calendar",
      });
    }

    return Response.json({ ok: true, created, details });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function latestPrice(sortedJobs, customer, settings) {
  for (let i = sortedJobs.length - 1; i >= 0; i--) {
    if (sortedJobs[i].price) return sortedJobs[i].price;
  }
  return customer.set_price || settings.default_price || 40;
}