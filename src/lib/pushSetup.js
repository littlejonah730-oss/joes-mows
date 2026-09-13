import { base44 } from "@/api/base44Client";
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from "@/lib/pushConfig";

const ENDPOINT_KEY = "lawnflow_push_endpoint";

// Turns on real Web Push for this installed-PWA phone and saves the subscription.
// role: "owner" | "employee" | "viewer" (employees pass their employeeId so they
// only ever receive their own jobs).
export async function enablePhonePush({ role = "owner", employeeId = "", employeeName = "" } = {}) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("This browser can't get push alerts. Install the app to your home screen and try again.");
  }
  const registration = await navigator.serviceWorker.register("/functions/sw", { scope: "/" });
  await navigator.serviceWorker.ready;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notifications were blocked. Allow them for this app in your phone's settings, then try again.");
  }

  // Always start a fresh registration: an existing one may still be bound
  // to an old signing key, which Apple rejects with 403 forever.
  let subscription = await registration.pushManager.getSubscription();
  if (subscription) await subscription.unsubscribe();
  subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  const json = subscription.toJSON();
  await base44.entities.PushSubscription.deleteMany({ endpoint: json.endpoint });
  await base44.entities.PushSubscription.create({
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    role,
    employee_id: employeeId || "",
    employee_name: employeeName || "",
    user_agent: navigator.userAgent.slice(0, 150),
    key_hint: VAPID_PUBLIC_KEY.slice(0, 12),
  });
  localStorage.setItem(ENDPOINT_KEY, json.endpoint);
  return subscription;
}

export async function disablePhonePush() {
  const registration = await navigator.serviceWorker.getRegistration("/").catch(() => null);
  const subscription = registration ? await registration.pushManager.getSubscription() : null;
  const endpoint = subscription ? subscription.toJSON().endpoint : localStorage.getItem(ENDPOINT_KEY);
  if (subscription) await subscription.unsubscribe();
  if (endpoint) await base44.entities.PushSubscription.deleteMany({ endpoint });
  localStorage.removeItem(ENDPOINT_KEY);
}

export function isPhonePushEnabled() {
  return !!localStorage.getItem("lawnflow_push_endpoint");
}