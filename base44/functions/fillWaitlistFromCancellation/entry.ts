import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { notifyAndPush } from '../../shared/notify.ts';

const LINE_JOB_TYPES = { mowing: "Mow", lights: "Lights Install", leaves: "Leaf Cleanup" };

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user || user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
    const b = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const jobId = body.job_id;
    if (!jobId) return Response.json({ error: "job_id required" }, { status: 400 });

    const job = await b.entities.Job.get(jobId);
    if (!job || job.status !== "cancelled") return Response.json({ ok: true, skipped: "not cancelled" });

    const todayStr = new Date().toISOString().slice(0, 10);
    const dateStr = String(job.scheduled_date || "").slice(0, 10);
    if (dateStr < todayStr) return Response.json({ ok: true, skipped: "past job" });

    const line = job.service_line || "mowing";
    const entries = await b.entities.WaitlistEntry.filter({ status: "waiting", service_line: line }, "created_date", 50);
    if (!entries || entries.length === 0) return Response.json({ ok: true, skipped: "waitlist empty" });

    // First in line for this service line
    const entry = entries[0];

    const newJob = await b.entities.Job.create({
      customer_id: entry.customer_id || `waitlist-${entry.id}`,
      customer_name: entry.name,
      customer_address: entry.address || "",
      scheduled_date: dateStr,
      status: "scheduled",
      price: entry.set_price || 0,
      job_type: LINE_JOB_TYPES[line] || "Mow",
      notes: entry.notes ? `From waitlist: ${entry.notes}` : "Booked automatically from the waitlist",
      recurring_rule: "one_time",
      is_recurring: false,
      service_line: line,
      auto_generated: true,
    });

    await b.entities.WaitlistEntry.update(entry.id, {
      status: "filled",
      filled_job_id: newJob.id,
      filled_date: new Date().toISOString(),
    });

    await notifyAndPush(b, {
      type: "waitlist_filled",
      title: `Waitlist auto-fill: ${entry.name}`,
      body: `Booked into the ${dateStr} slot opened by ${job.customer_name}'s cancellation (${line} line).`,
      severity: "success",
      dedup_key: `waitlist_${jobId}`,
      related_id: newJob.id,
      link: "/jobs",
    });

    return Response.json({ ok: true, filled: entry.name, new_job_id: newJob.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}