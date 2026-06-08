/**
 * Browser notification helpers.
 *
 * Real Web Push (delivery when the app is closed) needs a push service + VAPID
 * keys + a server to send — out of scope for a pure free-tier static deploy.
 * Instead we use the Notification API to surface reminders while the PWA is
 * open/installed, backed by the `notifications` table + `generate_due_reminders`
 * SQL routine for server-side generation (optionally scheduled with pg_cron).
 */

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}

/** Show a notification (prefers the service worker so it works when installed). */
export async function showNotification(title: string, body: string, link?: string): Promise<void> {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  const options: NotificationOptions = {
    body,
    icon: '/icons/icon.svg',
    badge: '/icons/icon.svg',
    data: { link: link ?? '/' },
  };
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, options);
      return;
    }
  } catch {
    /* fall through to page-level notification */
  }
  // eslint-disable-next-line no-new
  new Notification(title, options);
}
