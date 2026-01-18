/*
 * Sidebar Component
 * Navigation sidebar for dashboard layouts
 */

'use client';

import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  BookOpen,
  LogOut,
  GraduationCap,
  UserCog,
  ClipboardList,
  ChevronDown,
} from 'lucide-react';
import { useState } from 'react';
import type { UserRole } from '@/types';

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  children?: { label: string; href: string }[];
}

interface SidebarProps {
  role: UserRole;
  userName: string;
  onLogout: () => void;
}

export function Sidebar({ role, userName, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Navigation items by role
  const getNavItems = (): NavItem[] => {
    switch (role) {
      case 'admin':
        return [
          { label: 'Command Center', href: '/admin', icon: LayoutDashboard },
          { label: 'Trainer Stewardship', href: '/admin/trainers', icon: GraduationCap },
          { label: 'CRM Stewardship', href: '/admin/crm', icon: UserCog },
          { label: 'Candidate Transfer Desk', href: '/admin/reassign', icon: ClipboardList },
        ];
      case 'trainer':
        return [
          { label: 'Trainer Studio', href: '/trainer', icon: LayoutDashboard },
          { label: 'Roster Command', href: '/trainer/candidates', icon: Users },
          {
            label: 'Content Studio',
            href: '/trainer/content',
            icon: FolderOpen,
            children: [
              { label: 'Indexes', href: '/trainer/content/indexes' },
              { label: 'Courses', href: '/trainer/content/courses' },
            ],
          },
          { label: 'Assignment Orchestrator', href: '/trainer/assignments', icon: ClipboardList },
        ];
      case 'crm':
        return [
          { label: 'CRM Studio', href: '/crm', icon: LayoutDashboard },
          { label: 'Roster Command', href: '/crm/others', icon: Users },
          {
            label: 'Content Studio',
            href: '/crm/content',
            icon: FolderOpen,
            children: [
              { label: 'Indexes', href: '/crm/content/indexes' },
              { label: 'Courses', href: '/crm/content/courses' },
            ],
          },
          { label: 'Assignment Orchestrator', href: '/crm/assignments', icon: ClipboardList },
        ];
      case 'candidate':
      case 'other':
        return [
          { label: 'Learning Hub', href: '/learn', icon: BookOpen },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    );
  };

  const isActive = (href: string) => {
    if (href === `/${role}` || href === '/learn') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white/80 border-r border-slate-200/70 backdrop-blur-2xl flex flex-col z-40">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-200/70">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="Octonix Consulting"
            width={160}
            height={40}
            className="h-8 w-auto"
            priority
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.label}>
              {item.children ? (
                // Expandable menu item
                <div>
                  <button
                    onClick={() => toggleExpand(item.label)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive(item.href)
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </div>
                    <ChevronDown
                      className={cn(
                        'w-4 h-4 transition-transform',
                        expandedItems.includes(item.label) && 'rotate-180'
                      )}
                    />
                  </button>
                  {expandedItems.includes(item.label) && (
                    <ul className="mt-1 ml-8 space-y-1">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className={cn(
                              'block px-3 py-2 rounded-lg text-sm transition-colors',
                              pathname === child.href
                                ? 'text-blue-700'
                                : 'text-slate-500 hover:text-slate-900'
                            )}
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                // Regular menu item
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-slate-200/70">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-sm font-medium text-slate-700">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{userName}</p>
            <p className="text-xs text-slate-500 capitalize">{role}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </aside>
  );
}
