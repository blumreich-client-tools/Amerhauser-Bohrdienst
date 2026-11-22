/*
 * Service Worker: macht die App installierbar und offline startfähig.
 * 0.4.2-mwrlye7s ersetzt scripts/nachbau.mjs beim Bauen durch Version + Zeit,
 * dadurch bekommt jede neue Fassung einen eigenen Speicher und die alte
 * wird beim Aktivieren gelöscht.
 */
const SPEICHER = "bohrdienst-__STAND__";
const GRUNDLAGE = ["./","assets/index-BI8HsFSi.js","assets/index-em1ttlX0.css","assets/inter-latin-wght-normal-Dx4kXJAl.woff2","assets/logo-amerhauser-DBbhJIFU.svg","assets/roboto-condensed-latin-wght-italic-iMflhgpX.woff2","assets/roboto-condensed-latin-wght-normal-Cxzi1x1i.woff2","icons/icon-180.png","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-512.png","icons/icon.svg","index.html","manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SPEICHER).then((c) => c.addAll(GRUNDLAGE)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((namen) => Promise.all(namen.filter((n) => n !== SPEICHER).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const anfrage = e.request;
  if (anfrage.method !== "GET" || new URL(anfrage.url).origin !== self.location.origin) return;
  // Seite selbst: zuerst Netz (neue Fassung), ohne Netz aus dem Speicher.
  if (anfrage.mode === "navigate") {
    e.respondWith(
      fetch(anfrage)
        .then((antwort) => {
          const kopie = antwort.clone();
          caches.open(SPEICHER).then((c) => c.put("./", kopie));
          return antwort;
        })
        .catch(() => caches.match("./").then((a) => a ?? caches.match("index.html"))),
    );
    return;
  }
  // konfig.json (Server-Adresse) kann sich ändern: Netz zuerst.
  if (anfrage.url.endsWith("konfig.json")) {
    e.respondWith(fetch(anfrage).catch(() => caches.match(anfrage)));
    return;
  }
  // Dateien mit Prüfsumme im Namen ändern sich nie: Speicher zuerst.
  e.respondWith(
    caches.match(anfrage).then(
      (treffer) =>
        treffer ??
        fetch(anfrage).then((antwort) => {
          if (antwort.ok) {
            const kopie = antwort.clone();
            caches.open(SPEICHER).then((c) => c.put(anfrage, kopie));
          }
          return antwort;
        }),
    ),
  );
});
