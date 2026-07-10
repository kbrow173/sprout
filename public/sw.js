/*
  Sprout service worker — push notifications only (no offline caching).
  Kept intentionally tiny and dependency-free. The morning cron sends a Web Push
  payload; we render it as a notification and, on tap, focus/open the app.
*/

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Sprout", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "🌱 Sprout";
  const options = {
    body: data.body || "Your plants need a little love today.",
    icon: "/icon-192.png",
    badge: "/badge.png",
    tag: data.tag || "sprout-daily",
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) client.navigate(target);
            return;
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(target);
      })
  );
});
