'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { logout } from '@/lib/auth';

type Role = 'CUSTOMER' | 'CDA' | 'DEPT_ADMIN' | 'SUPER_ADMIN';

const NAV: { href: string; label: string; roles: Role[] }[] = [
  { href: '/dashboard/cda',        label: 'CDA Queue',    roles: ['CDA', 'SUPER_ADMIN'] },
  { href: '/dashboard/dept',       label: 'Dept Queue',   roles: ['DEPT_ADMIN', 'SUPER_ADMIN'] },
  { href: '/dashboard/superadmin', label: 'Escalations',  roles: ['SUPER_ADMIN'] },
  { href: '/report',               label: 'All Reports',  roles: ['CDA', 'DEPT_ADMIN', 'SUPER_ADMIN'] },
  { href: '/chat',                 label: 'New Request',  roles: ['CUSTOMER'] },
];

const ROLE_COLOR: Record<Role, string> = {
  CUSTOMER:    '#818cf8',
  CDA:         '#34d399',
  DEPT_ADMIN:  '#38bdf8',
  SUPER_ADMIN: '#fb923c',
};

export default function Sidebar() {
  const pathname = usePathname();
  const [role, setRole]   = useState<Role | null>(null);
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then((u: { role?: Role; email?: string; name?: string } | null) => {
        if (!u) return;
        setRole(u.role ?? null);
        setEmail(u.email ?? '');
        setName(u.name ?? '');
      })
      .catch(() => {});
  }, []);

  const visible = role ? NAV.filter(n => n.roles.includes(role)) : [];

  return (
    <aside style={{
      width: '200px', minHeight: '100vh',
      background: '#000000', borderRight: '1px solid #1a1a1a',
      display: 'flex', flexDirection: 'column',
      padding: '24px 16px', position: 'fixed',
      top: 0, left: 0, bottom: 0, zIndex: 100,
    }}>
      {/* Logo */}
      <Link href="/" style={{ textDecoration: 'none', marginBottom: '36px', display: 'block' }}>
        <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>
          ZeroDesk
        </span>
      </Link>

      {/* Nav */}
      <nav style={{ flex: 1 }}>
        <p style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#333333', marginBottom: '8px', paddingLeft: '8px' }}>
          Navigation
        </p>
        {visible.map(item => {
          const active = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 10px', borderRadius: '6px', textDecoration: 'none',
              background: active ? '#111111' : 'transparent',
              border: `1px solid ${active ? '#262626' : 'transparent'}`,
              marginBottom: '2px', transition: 'all 0.12s',
            }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = '#0a0a0a'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}
            >
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: active ? '#ffffff' : '#737373', fontWeight: active ? 500 : 400 }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '16px' }}>
        {role && (
          <div style={{ marginBottom: '12px' }}>
            <span style={{
              display: 'inline-block', fontSize: '10px', fontFamily: 'Space Grotesk, sans-serif',
              fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: ROLE_COLOR[role], border: `1px solid ${ROLE_COLOR[role]}40`,
              background: `${ROLE_COLOR[role]}12`, padding: '2px 8px', borderRadius: '4px',
              marginBottom: '6px',
            }}>
              {role.replace('_', ' ')}
            </span>
            <p style={{ fontSize: '13px', color: '#ffffff', marginBottom: '2px' }}>{name || '—'}</p>
            <p style={{ fontSize: '11px', color: '#404040', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Space Grotesk, sans-serif' }}>
              {email}
            </p>
          </div>
        )}
        <button onClick={logout} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 10px', background: 'transparent',
          border: '1px solid #1a1a1a', borderRadius: '6px', cursor: 'pointer',
          fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#404040',
          transition: 'all 0.12s',
        }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.color = '#f87171'; el.style.borderColor = 'rgba(248,113,113,0.3)';
            el.style.background = 'rgba(248,113,113,0.05)';
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.color = '#404040'; el.style.borderColor = '#1a1a1a';
            el.style.background = 'transparent';
          }}
        >
          ↩ Sign out
        </button>
      </div>
    </aside>
  );
}