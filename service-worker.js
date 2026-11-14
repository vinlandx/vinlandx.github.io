const CACHE_NAME = "vinlandx-v1.0.0";
const CACHE_STATIC = "vinlandx-static-v1";

// الملفات اللي تتحفظ offline
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/players.html",
  "/player.html",
  "/matches.html",
  "/leaderboard.html",
  "/compare.html",
  "/teams.html",
  "/stats.html",
  "/achievements.html",
  "/manifest.json",
  "/logo.png",
  "/icon.png",
  "/background1.png",
  "/background2.png",
  "/background3.png",
  "/background4.png",
  "/background5.png"
];

// ═══════════════════════════════════
// INSTALL — نحفظ الملفات
// ═══════════════════════════════════
self.addEventListener("install", (event) => {
  console.log("[SW] Installing...");
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[SW] Some assets failed to cache:", err);
      });
    }).then(() => self.skipWaiting())
  );
});

// ═══════════════════════════════════
// ACTIVATE — نمسح الكاش القديم
// ═══════════════════════════════════
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_STATIC && cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ═══════════════════════════════════
// FETCH — نجاوب من الكاش أو النت
// ═══════════════════════════════════
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // ما نحفظش طلبات Supabase
  if (url.hostname.includes("supabase.co")) {
    return;
  }

  // ما نحفظش طلبات خارجية (Google Fonts, CDN, إلخ)
  if (url.origin !== location.origin) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  // HTML → Network First
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_STATIC).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/index.html")))
    );
    return;
  }

  // الباقي → Cache First
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && request.method === "GET") {
          const clone = response.clone();
          caches.open(CACHE_STATIC).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});

// ═══════════════════════════════════
// PUSH NOTIFICATIONS
// ═══════════════════════════════════
self.addEventListener("push", (event) => {
  console.log("[SW] Push received:", event);

  let data = {
    title: "كرة الحومة - Vinlandx",
    body: "فيه حاجة جديدة في الموقع! ⚽",
    icon: "/icon.png",
    badge: "/icon.png",
    url: "/"
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      vibrate: [200, 100, 200],
      data: { url: data.url },
      actions: [
        { action: "open", title: "افتح الموقع" },
        { action: "close", title: "سكّر" }
      ]
    })
  );
});

// ═══════════════════════════════════
// CLICK ON NOTIFICATION
// ═══════════════════════════════════
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "close") return;

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // لو الموقع مفتوح، نروحو ليه
      for (const client of windowClients) {
        if (client.url.includes(urlToOpen) && "focus" in client) {
          return client.focus();
        }
      }
      // لو ما كانش مفتوح، نفتحوه
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// ═══════════════════════════════════
// BACKGROUND SYNC (اختياري)
// ═══════════════════════════════════
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-data") {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  console.log("[SW] Syncing data...");
  // هنا تقدر تزامن البيانات لما يرجع الاتصال
}

// ═══════════════════════════════════
// MESSAGE FROM APP
// ═══════════════════════════════════
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data?.type === "SHOW_NOTIFICATION") {
    self.registration.showNotification(event.data.title || "كرة الحومة", {
      body: event.data.body || "",
      icon: "/icon.png",
      badge: "/icon.png",
      vibrate: [200, 100, 200]
    });
  }
});
