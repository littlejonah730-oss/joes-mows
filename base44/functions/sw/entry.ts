// Serves the app's service worker so the installed PWA can receive Web Push.
// Registered from the client as navigator.serviceWorker.register("/functions/sw", { scope: "/" }).
const SW_SOURCE = `
self.addEventListener("install", function (event) {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(clients.claim());
});

self.addEventListener("push", function (event) {
  var data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (err) {
    data = {};
  }
  var title = data.title || "LawnFlow";
  var options = {
    body: data.body || "",
    tag: data.url || "lawnflow",
    data: { url: data.url || "/" }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        var client = list[i];
        if ("focus" in client) {
          client.focus();
          return client.navigate(url);
        }
      }
      return clients.openWindow(url);
    })
  );
});
`;

export default async function (req) {
  try {
    return new Response(SW_SOURCE, {
      status: 200,
      headers: {
        "Content-Type": "application/javascript",
        "Service-Worker-Allowed": "/",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}