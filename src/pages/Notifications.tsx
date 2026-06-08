import { useState } from 'react';
import { Bell, CheckCheck, AlertTriangle, Clock, ArrowUpRight, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { EmptyState } from '@/components/ui/Misc';
import { NotificationsApi } from '@/lib/api';
import { notificationPermission, requestNotificationPermission } from '@/lib/notifications';
import { formatDateTime, cn } from '@/lib/utils';
import type { AppNotification } from '@/types';

function iconFor(category: string) {
  switch (category) {
    case 'overdue':
      return <AlertTriangle size={16} className="text-red-500" />;
    case 'escalation':
      return <ArrowUpRight size={16} className="text-orange-500" />;
    case 'reminder':
      return <Clock size={16} className="text-gold-600" />;
    default:
      return <Bell size={16} className="text-navy-500" />;
  }
}

export function Notifications() {
  const { profile } = useAuth();
  const { notifications } = useData();
  const [perm, setPerm] = useState(notificationPermission());

  async function enable() {
    const result = await requestNotificationPermission();
    setPerm(result);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Notifications</h1>
          <p className="text-sm text-navy-400">{notifications.unreadCount} unread</p>
        </div>
        {notifications.unreadCount > 0 && profile && (
          <button className="btn-ghost" onClick={() => void NotificationsApi.markAllRead(profile.id)}>
            <CheckCheck size={16} /> Mark all read
          </button>
        )}
      </div>

      {perm !== 'granted' && perm !== 'unsupported' && (
        <div className="card flex items-center justify-between gap-3 p-4">
          <div>
            <p className="font-semibold text-navy-800">Enable push reminders</p>
            <p className="text-sm text-navy-400">Get deadline alerts even when the app is in the background.</p>
          </div>
          <button className="btn-gold" onClick={enable}>
            <Bell size={16} /> Enable
          </button>
        </div>
      )}

      {notifications.items.length === 0 ? (
        <EmptyState icon={<Bell size={32} />} title="No notifications" description="You're all caught up." />
      ) : (
        <ul className="space-y-2">
          {notifications.items.map((n) => (
            <NotificationRow key={n.id} n={n} />
          ))}
        </ul>
      )}
    </div>
  );
}

function NotificationRow({ n }: { n: AppNotification }) {
  const body = (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{iconFor(n.category)}</div>
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm', n.read_status ? 'text-navy-500' : 'font-medium text-navy-800')}>{n.message}</p>
        <p className="mt-0.5 text-xs text-navy-400">{formatDateTime(n.created_at)}</p>
      </div>
      {!n.read_status && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold-500" />}
    </div>
  );

  return (
    <li className={cn('card flex items-center gap-2 p-3', !n.read_status && 'border-l-4 border-l-gold-400')}>
      <div className="flex-1" onClick={() => !n.read_status && void NotificationsApi.markRead(n.id)}>
        {n.link ? (
          <Link to={n.link} onClick={() => void NotificationsApi.markRead(n.id)}>
            {body}
          </Link>
        ) : (
          body
        )}
      </div>
      <button className="rounded p-1.5 text-navy-300 hover:text-red-500" onClick={() => void NotificationsApi.remove(n.id)}>
        <Trash2 size={15} />
      </button>
    </li>
  );
}
