import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { notifyAndPush } from '../../shared/notify.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const customerName = body.customer_name || "Customer";
    const oldDate = String(body.old_date || "").slice(0, 10);
    const newDate = String(body.new_date || "").slice(0, 10);

    if (body.action === "cancelled") {
      await notifyAndPush(base44.asServiceRole, {
        type: "schedule_change",
        title: `${customerName}'s job cancelled`,
        body: oldDate ? `Removed from ${oldDate}` : "Removed from the calendar",
        severity: "warning",
        dedup_key: `sched_cancel_${body.job_id}`,
        related_id: body.job_id,
        link: "/calendar"
      });
      return Response.json({ ok: true, action: "cancelled" });
    }

    await notifyAndPush(base44.asServiceRole, {
      type: "schedule_change",
      title: `${customerName} rescheduled`,
      body: oldDate && newDate ? `Moved from ${oldDate} to ${newDate}` : "Schedule updated",
      severity: "info",
      dedup_key: `sched_move_${body.job_id}_${newDate}`,
      related_id: body.job_id,
      link: "/calendar"
    });
    return Response.json({ ok: true, action: "moved" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}