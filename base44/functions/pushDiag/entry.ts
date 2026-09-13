import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { pushToOwnerSubs } from '../../shared/push.ts';

// Diagnostic: sends a real test push to the owner's phone and reports
// exactly what each push service answered (per-endpoint HTTP status).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me || me.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }
    const b = base44.asServiceRole;
    const push = await pushToOwnerSubs(b, {
      type: "custom",
      title: "LawnFlow push test",
      body: "If you see this, phone alerts are working.",
      link: "/",
    });
    const subs = await b.entities.PushSubscription.list("-created_date", 500);
    return Response.json({
      push,
      subscriptions: subs.map((s) => ({
        isAdmin: !!s.is_admin,
        employeeId: s.employee_id || null,
        endpointHost: (() => { try { return new URL(s.endpoint).hostname; } catch { return "invalid"; } })(),
      })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}