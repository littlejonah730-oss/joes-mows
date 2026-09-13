import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { notifyAndPush } from '../../shared/notify.ts';
import { pushToSubs } from '../../shared/push.ts';

// Fired by the Job Completed Alert workflow when a job moves to completed.
// Notifies the owner (in-app + push) and pushes a congrats to the assigned
// employee's phone. The invoice itself is created by the app when the job
// is marked complete.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const b = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    if (!body.job_id) return Response.json({ error: "job_id required" }, { status: 400 });

    const job = await b.entities.Job.get(body.job_id).catch(() => null);
    if (!job || job.status !== "completed") return Response.json({ ok: true, skipped: true });

    const amount = job.price || 0;
    const who = job.claimed_by_name || job.exclusive_to_employee_name || "Crew";
    await notifyAndPush(b, {
      type: "job_completed",
      title: `${job.customer_name} completed — $${amount.toFixed(0)}`,
      body: `${who} finished the ${job.job_type || "job"}. Invoice created for $${amount.toFixed(2)}.`,
      severity: "success",
      link: "/invoices",
      related_id: job.id,
    });

    const empId = job.claimed_by_employee_id || job.exclusive_to_employee_id;
    if (empId) {
      const subs = (await b.entities.PushSubscription.list("-created_date", 500))
        .filter((s) => s.employee_id === empId && !s.is_admin);
      if (subs.length > 0) {
        await pushToSubs(b, {
          type: "job_completed",
          title: `${job.customer_name} — done! ✅`,
          body: "Nice work! The owner has been notified and your completion is logged.",
          link: "/",
        }, subs);
      }
    }
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}