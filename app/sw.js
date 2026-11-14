// CellGestor - service worker
// Arquivos do app: busca na internet primeiro (assim toda mudança chega na hora)
// e usa a cópia guardada só quando estiver sem internet.
// Os dados (Supabase) nunca são guardados aqui.
const CACHE = "cellgestor-v2";
const ARQUIVOS = ["./", "index.html", "estilo.css", "app.js", "config.js", "manifest.json",
                  "icones/icone-192.png", "icones/icone-512.png", "icones/apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;   // Supabase, WhatsApp...: direto
  e.respondWith(
    fetch(e.request).then((resp) => {
      if (resp.ok) { const copia = resp.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); }
      return resp;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match("index.html")))
  );
});

// ---------------- notificações (venda / OS nova) ----------------
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { title: "CellGestor", body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "CellGestor", {
    body: d.body || "",
    tag: d.tag || undefined,
    icon: "icones/icone-192.png",
    badge: "icones/badge-96.png",
    data: { url: d.url || "./" },
    vibrate: [120, 60, 120],
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const alvo = new URL(e.notification.data && e.notification.data.url ? e.notification.data.url : "./", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
    for (const j of janelas) {
      if (j.url.startsWith(self.registration.scope) && "focus" in j) { j.navigate(alvo).catch(() => {}); return j.focus(); }
    }
    return self.clients.openWindow(alvo);
  }));
});
