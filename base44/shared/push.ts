import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } from "./vapid.ts";

// Web Push (RFC 8030/8188/8291/8292) implemented with the built-in Web Crypto
// API — no external packages. Keys live in ./vapid.ts (public half mirrored in
// src/lib/pushConfig.js for the browser subscription step).

function b64urlToBytes(s) {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64url(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hkdf(salt, ikm, info, length) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: salt, info: info }, key, length * 8);
  return new Uint8Array(bits);
}

// RFC 8188/8291 aes128gcm payload encryption
async function encryptPayload(p256dhB64, authB64, plaintext) {
  const uaPub = await crypto.subtle.importKey(
    "raw", b64urlToBytes(p256dhB64), { name: "ECDH", namedCurve: "P-256" }, false, []
  );
  const local = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: uaPub }, local.privateKey, 256)
  );

  const authBytes = b64urlToBytes(authB64);
  const ikm = new Uint8Array(shared.length + authBytes.length);
  ikm.set(shared, 0);
  ikm.set(authBytes, shared.length);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, new TextEncoder().encode("Content-Encoding: aes128gcm\x00"), 16);
  const nonce = await hkdf(salt, ikm, new TextEncoder().encode("Content-Encoding: nonce\x00"), 12);

  // RFC 8188 single record: plaintext || 0x02 (last-record delimiter), no padding
  const ptBytes = new TextEncoder().encode(plaintext);
  const pt = new Uint8Array(ptBytes.length + 1);
  pt.set(ptBytes, 0);
  pt[ptBytes.length] = 2;

  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce, tagLength: 128 }, aesKey, pt)
  );

  // Body: salt(16) || record size(4, big-endian) || keyid length(0) || ciphertext
  const body = new Uint8Array(21 + ct.length);
  body.set(salt, 0);
  new DataView(body.buffer).setUint32(16, 4096);
  body[20] = 0;
  body.set(ct, 21);
  return body;
}

// RFC 8292 VAPID Authorization header
async function vapidHeader(publicKeyB64, privateKeyB64, endpoint) {
  const pubBytes = b64urlToBytes(publicKeyB64);
  const jwk = {
    kty: "EC",
    crv: "P-256",
    x: bytesToB64url(pubBytes.slice(1, 33)),
    y: bytesToB64url(pubBytes.slice(33, 65)),
    d: privateKeyB64
  };
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);

  const enc = new TextEncoder();
  const header = bytesToB64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = bytesToB64url(enc.encode(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: "mailto:owner@lawnflo.app"
  })));
  const signingInput = header + "." + claims;
  const rawSig = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(signingInput))
  );
  // raw P-1363 signature (r||s) -> JOSE (b64url(r) + b64url(s))
  const joseSig = bytesToB64url(rawSig.slice(0, 32)) + bytesToB64url(rawSig.slice(32));
  return "vapid t=" + signingInput + "." + joseSig + ", k=" + publicKeyB64;
}

function getVapidKeys() {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return null;
  return { publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY };
}

// Only deliver to known browser push services over HTTPS — blocks forged
// endpoint URLs from turning the push sender into an open proxy (SSRF).
const ALLOWED_PUSH_HOSTS = [
  "fcm.googleapis.com",            // Chrome / Edge / Android
  "updates.push.services.mozilla.com", // Firefox
  "web.push.apple.com",            // Safari (iOS + macOS)
  "web-por.push.apple.com",        // Safari (legacy endpoint)
];
function isAllowedEndpoint(endpoint) {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && ALLOWED_PUSH_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
}

async function deliverTo(b, notif, subs, keys) {
  const plaintext = JSON.stringify({
    title: notif.title,
    body: notif.body,
    url: notif.link || "/",
    kind: notif.type
  });
  let sent = 0;
  const dead = [];
  const results = [];
  for (const s of subs) {
    if (!isAllowedEndpoint(s.endpoint)) continue; // unknown push host: skip
    try {
      const body = await encryptPayload(s.p256dh, s.auth, plaintext);
      const authHeader = await vapidHeader(keys.publicKey, keys.privateKey, s.endpoint);
      const res = await fetch(s.endpoint, {
        method: "POST",
        headers: {
          "TTL": "86400",
          "Urgency": "high",
          "Content-Encoding": "aes128gcm",
          "Content-Type": "application/octet-stream",
          "Authorization": authHeader
        },
        body: body
      });
      let detail = "";
      if (res.status >= 400) {
        try { detail = (await res.text()).slice(0, 200); } catch (e) { detail = res.statusText; }
      }
      results.push(new URL(s.endpoint).hostname + " → " + res.status + (detail ? " | " + detail : ""));
      if (res.status >= 200 && res.status < 300) sent += 1;
      else if (res.status === 404 || res.status === 410) dead.push(s.id); // expired/uninstalled
    } catch (err) {
      // one bad device never blocks the others
    }
  }
  if (dead.length > 0) await b.entities.PushSubscription.deleteMany({ id: { $in: dead } });
  return { sent, results };
}

// Push only to the owner's (admin) phones — used for business alerts
export async function pushToOwnerSubs(b, notif) {
  const keys = getVapidKeys();
  if (!keys) return { sent: 0, skipped: "no-vapid-keys" };
  const subs = (await b.entities.PushSubscription.list("-created_date", 500)).filter((s) => s.is_admin);
  if (!subs || subs.length === 0) return { sent: 0 };
  return deliverTo(b, notif, subs, keys);
}

// Push to an explicit list of subscriptions (targeted employee/viewer sends)
export async function pushToSubs(b, notif, subs) {
  const keys = getVapidKeys();
  if (!keys) return { sent: 0, skipped: "no-vapid-keys" };
  if (!subs || subs.length === 0) return { sent: 0 };
  return deliverTo(b, notif, subs, keys);
}