import type { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-navy-400">{hint}</p>}
    </div>
  );
}

interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[] | string[];
  placeholder?: string;
  className?: string;
  /** Render an "All" / empty option with this label. */
  allowEmpty?: string;
}

export function Select({ value, onChange, options, placeholder, className, allowEmpty }: SelectProps) {
  return (
    <select className={cn('input', className)} value={value} onChange={(e) => onChange(e.target.value)}>
      {allowEmpty !== undefined && <option value="">{allowEmpty}</option>}
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative flex-1">
      <Search size={16} className="pointer-events-none absolute left-3 top-2.5 text-navy-400" />
      <input
        className="input pl-9"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

/** Toggleable chips for multi-select (client services, employee assignment). */
export function ChipMultiSelect({
  options,
  selected,
  onToggle,
}: {
  options: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = selected.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onToggle(o.id)}
            className={cn(
              'rounded-full border px-3 py-1 text-sm font-medium transition',
              active
                ? 'border-gold-500 bg-gold-100 text-gold-700'
                : 'border-navy-200 bg-white text-navy-600 hover:bg-navy-50',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-lg font-bold text-navy-800">{children}</h2>
      {action}
    </div>
  );
}
