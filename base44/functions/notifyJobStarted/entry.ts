import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { pushToOwnerSubs } from '../../shared/push.ts';

// Fired by the Job Started Alert workflow when a job moves to in_progress.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const b = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    if (!body.job_id) return Response.json({ error: "job_id required" }, { status: 400 });

    const job = await b.entities.Job.get(body.job_id).catch(() => null);
    if (!job || job.status !== "in_progress") return Response.json({ ok: true, skipped: true });

    const who = job.started_by_name || job.claimed_by_name || job.exclusive_to_employee_name || "Crew";
    // Quiet bell: job starts no longer create bell notifications — phone push only.
    await pushToOwnerSubs(b, {
      type: "job_started",
      title: `${job.customer_name} job started`,
      body: `${who} started the ${job.job_type || "job"}${job.customer_address ? ` — ${job.customer_address}` : ""}`,
      link: "/jobs",
    });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}