// Firebase Cloud Messaging Service Worker for Web Push
try {
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');
} catch (e) {
  console.log('[Service Worker] Running in standalone Web Push mode.');
}

self.addEventListener('install', () => {
  console.log('[Service Worker] Installed.');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activated.');
  event.waitUntil(clients.claim());
});

// Handle push event when browser receives an FCM payload in background
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push event received:', event);

  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { notification: { title: 'Notification', body: event.data.text() } };
    }
  }

  const title =
    payload.notification?.title ||
    payload.data?.title ||
    'EC Learnix Notification';

  const options = {
    body: payload.notification?.body || payload.data?.body || 'New scheduled notification received.',
    icon: payload.notification?.icon || '/favicon.ico',
    badge: payload.notification?.badge || '/favicon.ico',
    data: payload.data || {},
    requireInteraction: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click to navigate to the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.link || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

