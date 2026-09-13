import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { pushToOwnerSubs } from '../../shared/push.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const b = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const jobId = body.job_id;
    if (!jobId) return Response.json({ error: "job_id required" }, { status: 400 });

    const job = await b.entities.Job.get(jobId);
    const name = job.claimed_by_name || "An employee";
    const dateStr = String(job.scheduled_date || "").slice(0, 10);

    // Quiet bell: job claims no longer create bell notifications — phone push only.
    await pushToOwnerSubs(b, {
      type: "job_claimed",
      title: `${name} signed up for a job`,
      body: `${job.customer_name || "Customer"} · ${job.job_type || "Job"} · ${dateStr}`,
      link: "/jobs",
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}