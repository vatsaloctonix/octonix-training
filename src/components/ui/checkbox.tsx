/*
 * Checkbox Component
 * Styled checkbox input
 */

import { cn } from '@/lib/utils';
import { InputHTMLAttributes, forwardRef } from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, checked, ...props }, ref) => {
    return (
      <label
        htmlFor={id}
        className={cn('flex items-center gap-2 cursor-pointer', className)}
      >
        <div className="relative">
          <input
            ref={ref}
            type="checkbox"
            id={id}
            checked={checked}
            className="sr-only peer"
            {...props}
          />
          <div
            className={cn(
              'w-5 h-5 border-2 border-slate-300 rounded transition-colors',
              'peer-checked:bg-blue-600 peer-checked:border-blue-600',
              'peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2 peer-focus:ring-offset-white'
            )}
          >
            {checked && (
              <Check className="w-4 h-4 text-white absolute top-0.5 left-0.5" />
            )}
          </div>
        </div>
        {label && <span className="text-sm text-slate-700">{label}</span>}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
