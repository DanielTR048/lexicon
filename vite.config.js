import { defineConfig } from "vite";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

function publicAssets(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? publicAssets(path) : [path];
  });
}

export default defineConfig({
  base: "./",
  plugins: [
    {
      name: "lexicon-offline",
      apply: "build",
      generateBundle(_, bundle) {
        const publicDirectory = resolve("public");
        // APKs are downloaded explicitly. The web game only caches its own assets.
        const assets = publicAssets(publicDirectory)
          .filter((path) => !path.endsWith(".apk"))
          .sort();
        const files = [
          "./",
          "index.html",
          ...assets.map((path) =>
            relative(publicDirectory, path).replaceAll("\\", "/"),
          ),
          ...Object.keys(bundle).filter((file) => file !== "index.html"),
        ];
        const hash = createHash("sha256").update(JSON.stringify(bundle));
        for (const path of assets)
          hash
            .update(relative(publicDirectory, path))
            .update(readFileSync(path));
        const version = hash.digest("hex").slice(0, 12);
        this.emitFile({
          type: "asset",
          fileName: "sw.js",
          source: `
const SCOPE = self.registration.scope;
const PREFIX = 'lexicon-' + encodeURIComponent(new URL(SCOPE).pathname) + '-';
const CACHE = PREFIX + '${version}';
const FILES = ${JSON.stringify(files)}.map(file => new URL(file, SCOPE).href);
const PRECACHED_URLS = new Set(FILES);
const INDEX = new URL('index.html', SCOPE).href;
// These are public static files. Module requests add Origin while install
// requests do not, so a server's Vary: Origin must not hide our precached copy.
const readPrecached = request => caches.open(CACHE).then(cache => cache.match(request, { ignoreVary: true }));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'LEXICON_OFFLINE_STATUS' || !event.ports[0]) return;
  event.waitUntil(caches.open(CACHE).then(async cache => {
    const entries = await Promise.all(FILES.map(file => cache.match(file, { ignoreVary: true })));
    event.ports[0].postMessage({ ready: entries.every(response => response?.ok), version: '${version}' });
  }).catch(() => event.ports[0].postMessage({ ready: false })));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(SCOPE)) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => readPrecached(INDEX)));
  } else if (PRECACHED_URLS.has(event.request.url)) {
    event.respondWith(readPrecached(event.request).then(cached => cached || fetch(event.request)));
  }
});
`,
        });
      },
    },
  ],
});
