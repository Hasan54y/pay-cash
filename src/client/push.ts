function urlBase64ToUint8Array(base64: string) {
  const pad = '='.repeat((4 - base64.length % 4) % 4);
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
}

export async function registerPush(userId?: string | null): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

    // Register SW
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    // Get VAPID key
    const kr = await fetch('/api/vapid-public-key');
    const { key } = await kr.json() as { key: string };
    if (!key) return false;

    // Request permission
    let perm = Notification.permission;
    if (perm === 'default') perm = await Notification.requestPermission();
    if (perm !== 'granted') return false;

    // Subscribe
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
    }

    // Send to server
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON(), userId: userId ?? null }),
    });

    return true;
  } catch (e) {
    console.error('Push registration failed:', e);
    return false;
  }
}
