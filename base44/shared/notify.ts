import { pushToOwnerSubs } from './push.ts';

export async function createNotificationOnce(b, notif) {
  if (!notif.dedup_key) {
    return await b.entities.Notification.create(notif);
  }
  const existing = await b.entities.Notification.filter({ dedup_key: notif.dedup_key });
  if (Array.isArray(existing) && existing.length > 0) return null;
  return await b.entities.Notification.create(notif);
}

// Creates the in-app notification (owner's bell) AND web-pushes it to the
// owner's phones. Push is skipped when the notification was deduped or the
// VAPID keys are not configured yet.
export async function notifyAndPush(b, notif) {
  const created = await createNotificationOnce(b, notif);
  if (!created) return { created: null, pushed: 0 };
  const push = await pushToOwnerSubs(b, notif);
  return { created, pushed: push.sent };
}