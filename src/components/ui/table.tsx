/*
 * Table Component
 * Data table with sorting and actions
 */

import { cn } from '@/lib/utils';
// changed [from import { ReactNode } to import { ReactNode, TdHTMLAttributes }]
import { ReactNode, TdHTMLAttributes } from 'react';

interface TableProps {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full">{children}</table>
    </div>
  );
}

export function TableHeader({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-white/60 border-b border-slate-200/70">
      {children}
    </thead>
  );
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-slate-200/70">{children}</tbody>;
}

export function TableRow({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <tr
      className={cn(
        'hover:bg-slate-50 transition-colors',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export function TableHead({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider',
        className
      )}
    >
      {children}
    </th>
  );
}

// changed [from inline props type to TableCellProps with td attributes]
type TableCellProps = TdHTMLAttributes<HTMLTableCellElement> & {
  children: ReactNode;
  className?: string;
};

// changed [from inline props destructure to TableCellProps]
export function TableCell({
  children,
  className,
  ...props
}: TableCellProps) {
  return (
    // changed [from td without props to td with spread props]
    <td {...props} className={cn('px-4 py-3 text-sm text-slate-700', className)}>
      {children}
    </td>
  );
}
