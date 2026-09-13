import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { sendScheduleAlert } from '../../shared/scheduleAlert.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user || user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
    const b = base44.asServiceRole;
    const result = await sendScheduleAlert(b, "today");
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}