export const VAPID_PUBLIC_KEY =
  "BA1IrENoUSdDXScu31kV9LX4RocGvrNGQY6F45KOy8s28nNFbrKdUDeO-0eW4CUnXSAf9qi61h0-Elq1aFqnsVk";

export function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const outputArray = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    outputArray[i] = raw.charCodeAt(i);
  }
  return outputArray;
}