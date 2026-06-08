import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { initials, cn } from '@/lib/utils';

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('animate-spin text-navy-400', className)} />;
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-50">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-navy-700 font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      title={name}
    >
      {initials(name)}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-navy-200 bg-white px-6 py-12 text-center">
      {icon && <div className="mb-3 text-navy-300">{icon}</div>}
      <p className="font-semibold text-navy-700">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-navy-400">{description}</p>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: number | string;
  accent?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="card flex items-center gap-4 p-4">
      {icon && (
        <div className={cn('rounded-lg p-2.5', accent ?? 'bg-navy-100 text-navy-600')}>{icon}</div>
      )}
      <div>
        <p className="text-2xl font-bold leading-none text-navy-800">{value}</p>
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-navy-400">{label}</p>
      </div>
    </div>
  );
}
