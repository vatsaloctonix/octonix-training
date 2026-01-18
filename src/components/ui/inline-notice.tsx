/*
 * Inline Notice
 * Compact feedback banner for success, warning, and error states
 */

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface InlineNoticeProps {
  title?: string;
  message: string;
  variant?: 'success' | 'warning' | 'danger' | 'info';
  action?: ReactNode;
  className?: string;
}

export function InlineNotice({
  title,
  message,
  variant = 'info',
  action,
  className,
}: InlineNoticeProps) {
  const variants = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    danger: 'bg-red-50 border-red-200 text-red-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
  };

  return (
    <div className={cn('border rounded-xl px-4 py-3 text-sm', variants[variant], className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          {title && <p className="font-medium">{title}</p>}
          <p className={cn(title && 'mt-1')}>{message}</p>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
