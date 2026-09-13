import { useEffect, useState } from "react";
import { BellRing, BellOff, Loader2, Smartphone } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from "@/lib/pushConfig";

const ENDPOINT_KEY = "lawnflow_push_endpoint";

function pushSupported() {
  return (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    typeof window !== "undefined" &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function registerServiceWorker() {
  return navigator.serviceWorker.register("/functions/sw", { scope: "/" });
}

// isAdmin → the owner's phone (gets business alerts).
// employeeId → an employee's phone (gets their own job alerts, no pay info).
export default function PushEnableButton({ employeeId, isAdmin }) {
  const [supported, setSupported] = useState(false);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const ok = pushSupported();
    setSupported(ok);
    if (ok) setOn(Notification.permission === "granted" && !!localStorage.getItem(ENDPOINT_KEY));
  }, []);

  async function handleEnable() {
    setBusy(true);
    setError(null);
    try {
      const reg = await registerServiceWorker();
      const perm = await Notification.requestPermission();
      if (perm !== "granted") throw new Error("Notifications are blocked in your browser settings");
      // Always start a fresh registration: an existing one may still be bound
      // to an old signing key, which Apple rejects with 403 forever.
      let sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
      const json = sub.toJSON();
      // No explicit flag → owner-enabled from the admin bell; confirm via role.
      let adminFlag = isAdmin;
      if (adminFlag == null && !employeeId) {
        try {
          const me = await base44.auth.me();
          adminFlag = me?.role === "admin";
        } catch (e) {
          adminFlag = false;
        }
      }
      await base44.entities.PushSubscription.deleteMany({ endpoint: json.endpoint });
      await base44.entities.PushSubscription.create({
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        user_agent: navigator.userAgent.slice(0, 120),
        employee_id: employeeId || null,
        is_admin: !!adminFlag,
        key_hint: VAPID_PUBLIC_KEY.slice(0, 12)
      });
      localStorage.setItem(ENDPOINT_KEY, json.endpoint);
      setOn(true);
    } catch (e) {
      setError(e.message || "Could not enable phone alerts");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    setError(null);
    try {
      const reg = await registerServiceWorker();
      const sub = await reg.pushManager.getSubscription();
      const endpoint = localStorage.getItem(ENDPOINT_KEY) || (sub ? sub.endpoint : null);
      if (sub) await sub.unsubscribe();
      if (endpoint) await base44.entities.PushSubscription.deleteMany({ endpoint });
      localStorage.removeItem(ENDPOINT_KEY);
      setOn(false);
    } catch (e) {
      setError(e.message || "Could not disable phone alerts");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-3 py-2.5 border-t border-border">
      {!supported ? (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <Smartphone className="w-3.5 h-3.5 shrink-0" />
          Install the app on your phone to get push alerts
        </p>
      ) : on ? (
        <button
          type="button"
          onClick={handleDisable}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-semibold text-emerald-400 hover:bg-muted transition-colors select-none disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellOff className="w-3.5 h-3.5" />}
          Phone alerts ON — tap to stop
        </button>
      ) : (
        <button
          type="button"
          onClick={handleEnable}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-semibold text-primary hover:bg-primary/10 transition-colors select-none disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellRing className="w-3.5 h-3.5" />}
          Turn on phone alerts
        </button>
      )}
      {error && <p className="text-[10px] text-destructive mt-1.5">{error}</p>}
    </div>
  );
}