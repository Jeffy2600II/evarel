// Evarel PoC service worker — แสดงการแจ้งเตือนเมื่อได้รับ push
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data.json(); } catch (e) { data = { title: "Evarel", body: event.data.text() }; }
  event.waitUntil(
    self.registration.showNotification(data.title || "Evarel", {
      body: data.body || "",
      icon: "icon-192.png",
      badge: "icon-192.png",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});
