import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { notifyAndPush } from '../../shared/notify.ts';
import { pushToSubs } from '../../shared/push.ts';

// Sends the daily schedule alerts. mode "today" (6 AM) or "tomorrow" (8 PM).
// Owner: in-app notification + push with every job and its pay.
// Employees: push ONLY their own claimed/exclusive jobs, no pay info.
// Other schedule viewers: push with the day's jobs, no pay info.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user || user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
    const b = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const mode = body.mode === "tomorrow" ? "tomorrow" : "today";
    // Resolve "today"/"tomorrow" in the business's Central time zone — a UTC
    // date is wrong between 7pm and midnight, exactly when the 8pm alert runs.
    const shifted = new Date(Date.now() + (mode === "tomorrow" ? 86400000 : 0));
    const dateStr = shifted.toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
    const type = mode === "today" ? "jobs_today" : "jobs_tomorrow";

    const all = await b.entities.Job.filter({ scheduled_date: dateStr });
    const jobs = (all || []).filter((j) => j.status !== "cancelled");

    if (jobs.length === 0) {
      await notifyAndPush(b, {
        type,
        title: `No jobs ${mode}`,
        body: mode === "today" ? "Nothing scheduled for today — clear day." : "Nothing on the books for tomorrow yet.",
        severity: "info",
        dedup_key: `jobs_${mode}_${dateStr}`,
        link: "/calendar",
      });
      return Response.json({ ok: true, jobs: 0 });
    }

    const total = jobs.reduce((s, j) => s + (j.price || 0), 0);
    const detail = jobs
      .map((j) => `${j.customer_name} $${(j.price || 0).toFixed(0)}`)
      .join(" · ");
    await notifyAndPush(b, {
      type,
      title: `${jobs.length} job${jobs.length === 1 ? "" : "s"} ${mode} · $${total.toFixed(0)}`,
      body: detail.slice(0, 400),
      severity: "info",
      dedup_key: `jobs_${mode}_${dateStr}`,
      link: "/jobs",
    });

    // Employees & schedule viewers — no pay info anywhere in these pushes
    const subs = await b.entities.PushSubscription.list("-created_date", 500);
    const others = (subs || []).filter((s) => !s.is_admin);
    if (others.length > 0) {
      const byEmployee = {};
      const spectators = [];
      others.forEach((s) => {
        if (!s.employee_id) { spectators.push(s); return; }
        const mine = jobs.filter(
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
          title: `Your jobs ${mode} (${group.names.length})`,
          body: group.names.join(", ").slice(0, 300),
          link: "/",
        }, group.subs);
      }

      if (spectators.length > 0) {
        await pushToSubs(b, {
          type,
          title: `${jobs.length} jobs ${mode}`,
          body: jobs.map((j) => j.customer_name).join(", ").slice(0, 300),
          link: "/",
        }, spectators);
      }
    }

    return Response.json({ ok: true, jobs: jobs.length, total });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}