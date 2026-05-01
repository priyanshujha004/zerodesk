'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getUser, logout } from '../../lib/auth';
import type { UserDto, NavItem, Role } from '../../types';

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  CUSTOMER: [
    { label: 'My Returns', href: '/chat' },
  ],
  CDA: [
    { label: 'Review Queue', href: '/dashboard/cda' },
    { label: 'Auto-Resolved', href: '/dashboard/auto' },
  ],
  DEPT_ADMIN: [
    { label: 'My Queue', href: '/dashboard/dept' },
  ],
  SUPER_ADMIN: [
    { label: 'Escalations', href: '/dashboard/superadmin' },
    { label: 'All Reports', href: '/dashboard/cda' },
    { label: 'Settings', href: '/dashboard/settings' },
  ],
};

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const [user, setUser] = useState<UserDto | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    getUser().then(setUser);
  }, []);

  const navItems = user ? NAV_BY_ROLE[user.role] ?? [] : [];

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-surface border-r border-white/[0.06]
          flex flex-col transition-transform duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0 lg:z-auto
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 py-5 border-b border-white/[0.06]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent2 flex items-center justify-center shrink-0">
            <span className="text-[#0a0a0f] font-bold text-sm">R</span>
          </div>
          <span className="text-lg font-bold text-white tracking-tight">
            Resolve<span className="text-accent">IQ</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <a
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                  ${active
                    ? 'bg-accent/10 text-accent border border-accent/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }
                `}
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${active ? 'bg-accent' : 'bg-slate-600'}`} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        {/* User card */}
        {user && (
          <div className="px-3 py-4 border-t border-white/[0.06]">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/30 to-accent2/30 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-white">
                  {(user.name ?? user.email).charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.name ?? 'User'}
                </p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="mt-2 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all text-left"
            >
              Sign out
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
