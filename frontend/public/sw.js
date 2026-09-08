// Service Worker for Phantom AI Real-Time Web Push & FMC Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle push events from backend / FMC
self.addEventListener('push', (event) => {
  let payload = {
    title: 'Phantom AI Automation',
    body: 'A scheduled task or background trigger has executed.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'phantom-scheduled',
    data: { url: '/' }
  };

  if (event.data) {
    try {
      const data = event.data.json();
      payload = { ...payload, ...data };
    } catch {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/favicon.ico',
      badge: payload.badge || '/favicon.ico',
      tag: payload.tag || 'phantom-alert',
      vibrate: [200, 100, 200],
      data: payload.data,
      actions: [
        { action: 'open', title: 'Open Phantom AI' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    })
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        const targetUrl = (event.notification.data && event.notification.data.url) || '/';
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
