self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Pay Cash';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/cashapp-logo.png',
    badge: '/cashapp-logo.png',
    vibrate: [200, 100, 200],
    data: data,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(clients.openWindow('/admin'));
});
