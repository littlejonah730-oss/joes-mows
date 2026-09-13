import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { notifyAndPush } from '../../shared/notify.ts';

// Fired by the Login Alert workflow when a non-admin user signs in or signs up.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const b = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const email = body.email || "Someone";
    const method = String(body.auth_method || "password").replace(/_/g, " ");
    const isSignup = body.event_type === "signup";

    await notifyAndPush(b, {
      type: "login_alert",
      title: isSignup ? "New user joined the app" : "App sign-in",
      body: `${email} just signed ${isSignup ? "up" : "in"} via ${method}`,
      severity: "info",
      link: "/",
      related_id: body.user_id,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}