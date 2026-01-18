/*
 * Header Component
 * Top header for dashboard pages
 */

'use client';

import { SearchInput } from '../ui/search-input';
import { ReactNode, useState } from 'react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  meta?: { label: string; value: string }[];
  actions?: ReactNode;
  showSearch?: boolean;
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
}

export function Header({
  title,
  subtitle,
  meta,
  actions,
  showSearch,
  onSearch,
  searchPlaceholder = 'Search...',
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  return (
    <header className="min-h-16 bg-white/70 border-b border-slate-200/70 flex items-center justify-between px-6 py-3 sticky top-0 z-30 backdrop-blur-xl">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-slate-900 truncate">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 truncate">{subtitle}</p>}
        {meta && meta.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-500">
            {meta.map((item) => (
              <span
                key={`${item.label}-${item.value}`}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5"
              >
                <span className="text-slate-500">{item.label}</span>
                <span className="text-slate-700 font-medium">{item.value}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {showSearch && (
          <div className="w-64">
            <SearchInput
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onClear={() => handleSearch('')}
            />
          </div>
        )}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
