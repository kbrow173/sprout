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

  // App-icon badge with the due-plant count (Badging API, where supported).
  const badge =
    typeof data.badge === "number" && self.navigator && "setAppBadge" in self.navigator
      ? self.navigator.setAppBadge(data.badge).catch(() => {})
      : Promise.resolve();

  event.waitUntil(Promise.all([self.registration.showNotification(title, options), badge]));
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
