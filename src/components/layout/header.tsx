/*
 * Header Component
 * Top header for dashboard pages
 */

'use client';

import { SearchInput } from '../ui/search-input';
import { useState } from 'react';

interface HeaderProps {
  title: string;
  showSearch?: boolean;
  onSearch?: (query: string) => void;
}

export function Header({ title, showSearch, onSearch }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  return (
    <header className="h-16 bg-white/70 border-b border-slate-200/70 flex items-center justify-between px-6 sticky top-0 z-30 backdrop-blur-xl">
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>

      <div className="flex items-center gap-4">
        {showSearch && (
          <div className="w-64">
            <SearchInput
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onClear={() => handleSearch('')}
            />
          </div>
        )}
      </div>
    </header>
  );
}
