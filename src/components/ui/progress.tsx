/*
 * Progress Bar Component
 * Visual progress indicator
 */

import { cn } from '@/lib/utils';

interface ProgressProps {
  value: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function Progress({
  value,
  size = 'md',
  showLabel = false,
  className,
}: ProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  const sizes = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  // Color based on progress
  const getColor = () => {
    if (clampedValue >= 100) return 'bg-green-500';
    if (clampedValue >= 75) return 'bg-blue-500';
    if (clampedValue >= 50) return 'bg-yellow-500';
    return 'bg-blue-600';
  };

  return (
    <div className={cn('w-full', className)}>
      <div className={cn('w-full bg-slate-700 rounded-full overflow-hidden', sizes[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-300', getColor())}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-slate-400 mt-1 block text-right">
          {Math.round(clampedValue)}%
        </span>
      )}
    </div>
  );
}
