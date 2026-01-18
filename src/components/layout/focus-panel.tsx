/*
 * Focus Panel
 * Side panel for in-context creation and editing
 */

'use client';

import { cn } from '@/lib/utils';
import { ReactNode, useEffect, useId } from 'react';
import { X } from 'lucide-react';

interface FocusPanelProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  onClose: () => void;
}

export function FocusPanel({
  isOpen,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  onClose,
}: FocusPanelProps) {
  const titleId = useId();

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'absolute right-0 top-0 h-full w-full bg-white/95 border-l border-white/60 shadow-[0_20px_60px_rgba(15,23,42,0.18)] backdrop-blur-2xl flex flex-col',
          sizes[size]
        )}
      >
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-200/70">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-slate-900">
              {title}
            </h2>
            {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-500 hover:text-slate-900 transition-colors"
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="px-6 py-4 border-t border-slate-200/70 bg-white/80 backdrop-blur-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
