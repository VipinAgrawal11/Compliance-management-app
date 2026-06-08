/// <reference lib="webworker" />
/**
 * Custom Workbox service worker (injectManifest strategy).
 *
 *  - Precaches the app shell for offline launch.
 *  - NetworkFirst for Supabase reads so cached data is available offline.
 *  - Background Sync: when connectivity returns, wakes open clients to flush the
 *    IndexedDB outbox (queued status updates / notes).
 *  - Notification click handling.
 */
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

self.skipWaiting();

// --- Precache app shell ------------------------------------------------------
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// SPA navigation fallback to index.html (except Supabase API calls).
const navHandler = createHandlerBoundToURL('index.html');
registerRoute(
  new NavigationRoute(navHandler, {
    denylist: [/^\/rest\//, /^\/auth\//, /^\/realtime\//],
  }),
);

// --- Supabase reads: NetworkFirst (fall back to cache offline) ---------------
registerRoute(
  ({ url, request }) => url.pathname.startsWith('/rest/v1') && request.method === 'GET',
  new NetworkFirst({
    cacheName: 'supabase-rest',
    networkTimeoutSeconds: 5,
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 })],
  }),
);

// Auth: always network (never cache credentials).
registerRoute(({ url }) => url.pathname.startsWith('/auth/'), new NetworkOnly());

// --- Background Sync: tell open clients to drain the outbox -------------------
self.addEventListener('sync', (event: Event) => {
  const e = event as Event & { tag: string; waitUntil: (p: Promise<unknown>) => void };
  if (e.tag === 'outbox-sync') {
    e.waitUntil(notifyClientsToSync());
  }
});

async function notifyClientsToSync(): Promise<void> {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  for (const client of clients) client.postMessage({ type: 'flush-outbox' });
}

// --- Notifications -----------------------------------------------------------
self.addEventListener('notificationclick', (event) => {
  const link = (event.notification.data && event.notification.data.link) || '/';
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.postMessage({ type: 'navigate', link });
          return client.focus();
        }
      }
      return self.clients.openWindow(link);
    }),
  );
});

// Allow the page to trigger immediate activation after an update.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
