import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
}

export function Modal({ open, title, onClose, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/50 p-0 sm:items-center sm:p-4">
      <div
        className={`animate-fade-in flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl ${
          size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg'
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-navy-100 px-5 py-4">
          <h2 className="text-lg font-bold text-navy-800">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-navy-400 hover:bg-navy-100 hover:text-navy-700"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-navy-100 px-5 py-3">{footer}</div>
        )}
      </div>
    </div>
  );
}
