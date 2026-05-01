'use client';

import { useEffect, useState } from 'react';
import { getUser } from '../../lib/auth';
import type { UserDto, Role } from '../../types';

const ROLE_LABELS: Record<Role, string> = {
  CUSTOMER: 'Customer',
  CDA: 'CDA Agent',
  DEPT_ADMIN: 'Dept Admin',
  SUPER_ADMIN: 'Super Admin',
};

const ROLE_COLORS: Record<Role, string> = {
  CUSTOMER: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  CDA: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  DEPT_ADMIN: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  SUPER_ADMIN: 'bg-accent/10 text-accent border-accent/20',
};

interface NavbarProps {
  onToggleSidebar: () => void;
}

export default function Navbar({ onToggleSidebar }: NavbarProps) {
  const [user, setUser] = useState<UserDto | null>(null);

  useEffect(() => {
    getUser().then(setUser);
  }, []);

  return (
    <header className="h-14 bg-surface/80 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      {/* Left: hamburger + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg hover:bg-white/[0.04] text-slate-400 hover:text-white transition-colors lg:hidden"
          aria-label="Toggle sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="hidden lg:flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-accent2 flex items-center justify-center">
            <span className="text-[#0a0a0f] font-bold text-xs">R</span>
          </div>
          <span className="text-sm font-bold text-white tracking-tight">
            Resolve<span className="text-accent">IQ</span>
          </span>
        </div>
      </div>

      {/* Right: role badge + user */}
      <div className="flex items-center gap-3">
        {user && (
          <>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-medium border ${ROLE_COLORS[user.role]}`}
            >
              {ROLE_LABELS[user.role]}
            </span>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/30 to-accent2/30 flex items-center justify-center">
                <span className="text-xs font-semibold text-white">
                  {(user.name ?? user.email).charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm text-slate-300 hidden sm:inline">
                {user.name ?? user.email}
              </span>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
