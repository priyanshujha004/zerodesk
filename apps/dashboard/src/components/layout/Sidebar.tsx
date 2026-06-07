'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type Role = 'CUSTOMER' | 'CDA' | 'DEPT_ADMIN' | 'SUPER_ADMIN';

interface NavItem { href: string; label: string; roles: Role[]; }

const NAV: NavItem[] = [
  { href: '/dashboard/cda',        label: 'CDA Queue',       roles: ['CDA'] },
  { href: '/dashboard/dept',       label: 'My Queue',        roles: ['DEPT_ADMIN'] },
  { href: '/dashboard/superadmin', label: 'Escalations',     roles: ['SUPER_ADMIN'] },
  { href: '/report',               label: 'All Reports',     roles: ['CDA', 'DEPT_ADMIN', 'SUPER_ADMIN'] },
  { href: '/chat',                 label: 'New Complaint',   roles: ['CUSTOMER'] },
];

const ROLE_LABEL: Record<Role, string> = {
  CUSTOMER: 'Customer', CDA: 'CDA', DEPT_ADMIN: 'Dept Admin', SUPER_ADMIN: 'Super Admin',
};

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [role, setRole]   = useState<Role | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName]   = useState('');

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

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    localStorage.removeItem('access_token');
    router.push('/');
  }

  const nav = role ? NAV.filter(n => n.roles.includes(role)) : [];

  return (
    <aside style={{
      position: 'fixed', top: 0, left: 0, bottom: 0,
      width: '224px',
      background: '#000000',
      borderRight: '1px solid #1a1a1a',
      display: 'flex', flexDirection: 'column',
      padding: '24px 16px',
      zIndex: 100,
    }}>

      {/* Wordmark */}
      <div style={{ marginBottom: '32px', paddingLeft: '8px' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontSize: '15px', fontWeight: 600,
            letterSpacing: '-0.01em', color: '#ffffff',
          }}>
            ZeroDesk
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {nav.map(item => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex', alignItems: 'center',
                padding: '7px 10px',
                borderRadius: '6px',
                textDecoration: 'none',
                background: active ? '#111111' : 'transparent',
                color: active ? '#ffffff' : '#737373',
                fontSize: '13px',
                fontWeight: active ? 500 : 400,
                transition: 'all 0.1s ease',
                border: `1px solid ${active ? '#262626' : 'transparent'}`,
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLAnchorElement).style.color = '#ffffff';
                  (e.currentTarget as HTMLAnchorElement).style.background = '#0a0a0a';
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLAnchorElement).style.color = '#737373';
                  (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                }
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '16px' }}>
        {role && (
          <div style={{ paddingLeft: '10px', marginBottom: '12px' }}>
            <div style={{
              fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: '#404040', marginBottom: '4px',
            }}>
              {ROLE_LABEL[role]}
            </div>
            <div style={{ fontSize: '13px', color: '#a3a3a3', fontWeight: 500, marginBottom: '2px' }}>
              {name || '—'}
            </div>
            <div style={{
              fontSize: '12px', color: '#404040',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {email}
            </div>
          </div>
        )}
        <button
          onClick={logout}
          style={{
            width: '100%', padding: '7px 10px',
            background: 'transparent', border: '1px solid transparent',
            borderRadius: '6px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px',
            fontSize: '13px', color: '#404040',
            fontFamily: 'Inter, sans-serif',
            transition: 'all 0.1s ease',
            textAlign: 'left',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color = '#f87171';
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(248,113,113,0.06)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(248,113,113,0.15)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color = '#404040';
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
          }}
        >
          <span style={{ fontSize: '12px' }}>↩</span> Sign out
        </button>
      </div>
    </aside>
  );
}