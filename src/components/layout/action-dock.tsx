/*
 * Action Dock
 * Consistent action cluster for page headers
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ActionDockProps {
  children: ReactNode;
  className?: string;
}

export function ActionDock({ children, className }: ActionDockProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {children}
    </div>
  );
}
