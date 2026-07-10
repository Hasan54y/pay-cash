export async function registerPushNotifications(userId?: string) {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    // Register service worker
    const reg = await navigator.serviceWorker.register("/sw.js");

    // Get VAPID public key
    const r = await fetch("/api/vapid-public-key");
    const { key } = await r.json() as { key: string };
    if (!key) return;

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    // Subscribe
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });

    // Send to server
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON(), userId }),
    });
  } catch { /**/ }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}
