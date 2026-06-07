'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

/* ─── Auth drawer ─────────────────────────────────────────── */
type AuthTab = 'signin' | 'register';

const ROLE_ROUTES: Record<string, string> = {
  CDA:         '/dashboard/cda',
  DEPT_ADMIN:  '/dashboard/dept',
  SUPER_ADMIN: '/dashboard/superadmin',
  CUSTOMER:    '/chat',
};

function AuthDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [tab, setTab]           = useState<AuthTab>('signin');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);

  /* Sign-in state */
  const [siEmail, setSiEmail]       = useState('');
  const [siPassword, setSiPassword] = useState('');

  /* Register state */
  const [rName, setRName]         = useState('');
  const [rEmail, setREmail]       = useState('');
  const [rPassword, setRPassword] = useState('');
  const [rConfirm, setRConfirm]   = useState('');

  /* Reset on tab switch */
  useEffect(() => { setError(null); setSuccess(null); }, [tab]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!siEmail || !siPassword) { setError('Both fields required.'); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: siEmail, password: siPassword }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(d.message ?? 'Invalid credentials');
      }
      const data = await res.json() as { accessToken?: string; role?: string };
      if (data.accessToken) localStorage.setItem('access_token', data.accessToken);
      router.push(ROLE_ROUTES[data.role ?? ''] ?? '/dashboard/cda');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed');
    } finally { setLoading(false); }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!rName || !rEmail || !rPassword) { setError('All fields required.'); return; }
    if (rPassword !== rConfirm) { setError('Passwords do not match.'); return; }
    if (rPassword.length < 8)  { setError('Password must be at least 8 characters.'); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: rName, email: rEmail, password: rPassword }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(d.message ?? 'Registration failed');
      }
      setSuccess('Account created. Sign in to continue.');
      setTab('signin');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed');
    } finally { setLoading(false); }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#111111',
    border: '1px solid #262626',
    borderRadius: '6px',
    padding: '10px 14px',
    fontSize: '14px',
    color: '#ffffff',
    outline: 'none',
    transition: 'border-color 0.12s',
    fontFamily: 'Inter, sans-serif',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 500,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    color: '#737373',
    display: 'block',
    marginBottom: '6px',
  };

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 300,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'all' : 'none',
          transition: 'opacity 0.25s ease',
          backdropFilter: 'blur(3px)',
        }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0, right: 0, bottom: 0,
          width: '420px',
          background: '#000000',
          borderLeft: '1px solid #262626',
          zIndex: 301,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        {/* Drawer header */}
        <div style={{
          padding: '20px 32px',
          borderBottom: '1px solid #1a1a1a',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', fontWeight: 600, color: '#ffffff' }}>
            ZeroDesk
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: '1px solid #262626',
              borderRadius: '6px', cursor: 'pointer',
              width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#737373', fontSize: '16px', transition: 'color 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={e => (e.currentTarget.style.color = '#737373')}
          >
            ✕
          </button>
        </div>

        {/* Tab switcher */}
        <div style={{ padding: '24px 32px 0' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            border: '1px solid #1a1a1a', borderRadius: '8px',
            padding: '3px', gap: '3px',
            background: '#0a0a0a',
          }}>
            {(['signin', 'register'] as AuthTab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '8px',
                  borderRadius: '6px',
                  border: 'none', cursor: 'pointer',
                  background: tab === t ? '#ffffff' : 'transparent',
                  color: tab === t ? '#000000' : '#737373',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '13px', fontWeight: tab === t ? 500 : 400,
                  transition: 'all 0.15s ease',
                }}
              >
                {t === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>
        </div>

        {/* Form area */}
        <div style={{ padding: '32px', flex: 1 }}>

          {success && (
            <div style={{
              padding: '12px 14px', marginBottom: '20px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid #262626', borderRadius: '6px',
              fontSize: '13px', color: '#a3a3a3',
            }}>
              {success}
            </div>
          )}

          {error && (
            <div style={{
              padding: '12px 14px', marginBottom: '20px',
              background: 'rgba(248,113,113,0.05)',
              border: '1px solid rgba(248,113,113,0.2)', borderRadius: '6px',
              fontSize: '13px', color: '#f87171',
            }}>
              {error}
            </div>
          )}

          {/* Sign in form */}
          {tab === 'signin' && (
            <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={labelStyle}>Email address</label>
                <input
                  style={inputStyle}
                  type="email" placeholder="you@example.com"
                  value={siEmail} onChange={e => setSiEmail(e.target.value)}
                  autoComplete="email"
                  onFocus={e => (e.target.style.borderColor = '#404040')}
                  onBlur={e => (e.target.style.borderColor = '#262626')}
                />
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <input
                  style={inputStyle}
                  type="password" placeholder="••••••••"
                  value={siPassword} onChange={e => setSiPassword(e.target.value)}
                  autoComplete="current-password"
                  onFocus={e => (e.target.style.borderColor = '#404040')}
                  onBlur={e => (e.target.style.borderColor = '#262626')}
                />
              </div>
              <button
                type="submit" disabled={loading}
                style={{
                  marginTop: '8px',
                  padding: '11px 20px',
                  background: loading ? '#1a1a1a' : '#ffffff',
                  color: '#000000',
                  border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500,
                  transition: 'background 0.12s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#d4d4d4'; }}
                onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#ffffff'; }}
              >
                {loading && (
                  <span style={{
                    width: '13px', height: '13px',
                    border: '2px solid #888', borderTopColor: 'transparent',
                    borderRadius: '50%', display: 'inline-block',
                    animation: 'spin 0.6s linear infinite',
                  }} />
                )}
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          )}

          {/* Register form */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { label: 'Full name',         type: 'text',     ph: 'Rohan Sharma',    val: rName,     set: setRName,     ac: 'name' },
                { label: 'Email address',     type: 'email',    ph: 'you@example.com', val: rEmail,    set: setREmail,    ac: 'email' },
                { label: 'Password',          type: 'password', ph: '8+ characters',   val: rPassword, set: setRPassword, ac: 'new-password' },
                { label: 'Confirm password',  type: 'password', ph: 'Repeat password', val: rConfirm,  set: setRConfirm,  ac: 'new-password' },
              ].map(f => (
                <div key={f.label}>
                  <label style={labelStyle}>{f.label}</label>
                  <input
                    style={inputStyle}
                    type={f.type} placeholder={f.ph}
                    value={f.val} onChange={e => f.set(e.target.value)}
                    autoComplete={f.ac}
                    onFocus={e => (e.target.style.borderColor = '#404040')}
                    onBlur={e => (e.target.style.borderColor = '#262626')}
                  />
                </div>
              ))}
              <button
                type="submit" disabled={loading}
                style={{
                  marginTop: '4px',
                  padding: '11px 20px',
                  background: loading ? '#1a1a1a' : '#ffffff',
                  color: '#000000',
                  border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500,
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#d4d4d4'; }}
                onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#ffffff'; }}
              >
                {loading ? 'Creating…' : 'Create account'}
              </button>
            </form>
          )}
        </div>

        {/* Role guide at the bottom */}
        <div style={{ padding: '24px 32px', borderTop: '1px solid #1a1a1a' }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#404040', marginBottom: '12px' }}>
            Role access
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { role: 'Customer',    desc: 'Raise & track complaints' },
              { role: 'CDA',         desc: 'Review & route reports' },
              { role: 'Dept Admin',  desc: 'Resolve department queue' },
              { role: 'Super Admin', desc: 'Handle escalations' },
            ].map(r => (
              <div key={r.role} style={{ display: 'flex', gap: '12px', alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '12px', fontWeight: 500, color: '#a3a3a3', minWidth: '88px' }}>
                  {r.role}
                </span>
                <span style={{ fontSize: '12px', color: '#404040' }}>{r.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

/* ─── Hamburger button ─────────────────────────────────────── */
function HamburgerBtn({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Open menu"
      style={{
        width: '36px', height: '36px',
        background: 'none',
        border: '1px solid #262626',
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '5px', padding: '0',
        transition: 'border-color 0.12s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#404040')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#262626')}
    >
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          display: 'block',
          width: open
            ? i === 1 ? '0px' : '14px'
            : '14px',
          height: '1px',
          background: '#ffffff',
          transition: 'width 0.2s ease, transform 0.2s ease, opacity 0.2s ease',
          transform: open
            ? i === 0 ? 'translateY(6px) rotate(45deg)' : i === 2 ? 'translateY(-6px) rotate(-45deg)' : 'none'
            : 'none',
          opacity: open && i === 1 ? 0 : 1,
        }} />
      ))}
    </button>
  );
}

/* ─── Section heading ──────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: '11px', fontWeight: 500, letterSpacing: '0.1em',
      textTransform: 'uppercase', color: '#737373', marginBottom: '20px',
    }}>
      {children}
    </p>
  );
}

/* ─── Feature row ──────────────────────────────────────────── */
function Feature({ title, desc, index }: { title: string; desc: string; index: number }) {
  return (
    <div style={{
      padding: '28px 0',
      borderBottom: '1px solid #1a1a1a',
      display: 'grid', gridTemplateColumns: '32px 1fr 2fr',
      gap: '24px', alignItems: 'start',
      animation: `fadeUp 0.4s ease ${index * 60}ms both`,
    }}>
      <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '12px', color: '#404040', paddingTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
        {String(index + 1).padStart(2, '0')}
      </span>
      <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '15px', fontWeight: 500, color: '#ffffff', lineHeight: 1.3 }}>
        {title}
      </span>
      <span style={{ fontSize: '13px', color: '#737373', lineHeight: 1.6 }}>
        {desc}
      </span>
    </div>
  );
}

/* ─── Process step ─────────────────────────────────────────── */
function ProcessStep({ label, sub, last }: { label: string; sub: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <div style={{
        border: '1px solid #262626',
        borderRadius: '8px',
        padding: '14px 20px',
        background: '#111111',
        minWidth: '160px',
      }}>
        <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '13px', fontWeight: 500, color: '#ffffff' }}>{label}</p>
        <p style={{ fontSize: '11px', color: '#737373', marginTop: '3px' }}>{sub}</p>
      </div>
      {!last && (
        <div style={{ width: '1px', height: '28px', background: '#262626', margin: '0 auto' }} />
      )}
    </div>
  );
}

/* ─── Main ─────────────────────────────────────────────────── */
export default function LandingPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  /* Lock scroll when drawer open */
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  return (
    <div style={{ background: '#000000', color: '#ffffff', fontFamily: 'Inter, sans-serif', minHeight: '100vh' }}>

      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: '56px',
        borderBottom: '1px solid #1a1a1a',
        background: 'rgba(0,0,0,0.9)',
        backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 48px',
        zIndex: 100,
      }}>
        <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '15px', fontWeight: 600, letterSpacing: '-0.01em', color: '#ffffff' }}>
          ZeroDesk
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {['Product', 'Workflow', 'Roles'].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`} style={{ fontSize: '13px', color: '#737373', transition: 'color 0.12s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={e => (e.currentTarget.style.color = '#737373')}
            >
              {item}
            </a>
          ))}
          <div style={{ width: '1px', height: '16px', background: '#262626' }} />
          <HamburgerBtn open={drawerOpen} onClick={() => setDrawerOpen(o => !o)} />
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        paddingTop: '56px',
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '128px 48px 96px',
        borderBottom: '1px solid #1a1a1a',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background grid — very subtle */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(#1a1a1a 1px, transparent 1px), linear-gradient(90deg, #1a1a1a 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          opacity: 0.3,
          maskImage: 'radial-gradient(ellipse at 50% 0%, black 0%, transparent 70%)',
        }} />

        <div style={{ position: 'relative', maxWidth: '900px' }}>
          <div
            className="animate-fade-up"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              border: '1px solid #262626', borderRadius: '4px',
              padding: '4px 12px', marginBottom: '40px',
              background: '#111111',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffffff', display: 'inline-block' }} />
            <span style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#a3a3a3' }}>
              AI-assisted support operations
            </span>
          </div>

          <h1
            className="animate-fade-up d-100"
            style={{
              fontFamily: 'Space Grotesk, sans-serif',
              fontSize: 'clamp(52px, 8vw, 104px)',
              fontWeight: 700,
              lineHeight: 0.9,
              letterSpacing: '-0.035em',
              color: '#ffffff',
              marginBottom: '32px',
            }}
          >
            Customer support,<br />
            <span style={{ color: '#404040' }}>without the chaos.</span>
          </h1>

          <p
            className="animate-fade-up d-200"
            style={{
              fontSize: '16px', color: '#737373', lineHeight: 1.7,
              maxWidth: '540px', marginBottom: '48px',
            }}
          >
            ZeroDesk helps teams collect, classify, route, and resolve customer issues through structured workflows and AI-assisted intake.
          </p>

          <div className="animate-fade-up d-300" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={() => setDrawerOpen(true)}
              style={{
                padding: '11px 24px',
                background: '#ffffff', color: '#000000',
                border: 'none', borderRadius: '6px',
                fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500,
                cursor: 'pointer', transition: 'background 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#d4d4d4')}
              onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}
            >
              Get started
            </button>
            <a
              href="#product"
              style={{
                padding: '11px 24px',
                background: 'transparent', color: '#a3a3a3',
                border: '1px solid #262626', borderRadius: '6px',
                fontFamily: 'Inter, sans-serif', fontSize: '14px',
                cursor: 'pointer', transition: 'all 0.12s', textDecoration: 'none',
                display: 'inline-flex',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#ffffff'; (e.currentTarget as HTMLAnchorElement).style.borderColor = '#404040'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#a3a3a3'; (e.currentTarget as HTMLAnchorElement).style.borderColor = '#262626'; }}
            >
              See how it works ↓
            </a>
          </div>
        </div>

        {/* Mock product preview */}
        <div
          className="animate-fade-up d-500"
          style={{
            marginTop: '80px',
            position: 'relative',
            maxWidth: '780px',
          }}
        >
          {/* Window chrome */}
          <div style={{
            border: '1px solid #262626', borderRadius: '12px', overflow: 'hidden',
            boxShadow: '0 0 0 1px #1a1a1a, 0 32px 64px rgba(0,0,0,0.5)',
          }}>
            <div style={{
              background: '#111111', borderBottom: '1px solid #262626',
              padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              {['#ff5f57','#febc2e','#28c840'].map(c => (
                <span key={c} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c, opacity: 0.6 }} />
              ))}
              <span style={{ marginLeft: '8px', fontSize: '12px', color: '#404040', fontFamily: 'Space Grotesk, sans-serif' }}>
                ZeroDesk — CDA Dashboard
              </span>
            </div>

            {/* Simulated table */}
            <div style={{ background: '#0a0a0a', padding: '0' }}>
              {/* Table header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '40px 2fr 1fr 1fr 1fr 80px',
                padding: '10px 20px', borderBottom: '1px solid #1a1a1a',
                gap: '16px',
              }}>
                {['#', 'Report', 'Type', 'Priority', 'SLA', 'Status'].map(h => (
                  <span key={h} style={{ fontSize: '11px', color: '#404040', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'Space Grotesk, sans-serif' }}>
                    {h}
                  </span>
                ))}
              </div>

              {[
                { id: 'A4F2', summary: 'Order not delivered — want refund', type: 'REFUND', pri: 'HIGH', sla: '2h 14m', status: 'PENDING' },
                { id: 'B7C1', summary: 'Wrong item received, need replacement', type: 'COMPLAINT', pri: 'MEDIUM', sla: '11h 40m', status: 'PENDING' },
                { id: 'C9E3', summary: 'Account email change request', type: 'DATA', pri: 'LOW', sla: '58h 20m', status: 'INFO REQ' },
              ].map((r, i) => (
                <div key={r.id} style={{
                  display: 'grid', gridTemplateColumns: '40px 2fr 1fr 1fr 1fr 80px',
                  padding: '14px 20px', borderBottom: i < 2 ? '1px solid #141414' : 'none',
                  gap: '16px', alignItems: 'center',
                }}>
                  <span style={{ fontSize: '11px', color: '#303030', fontFamily: 'Space Grotesk, sans-serif' }}>
                    {r.id}
                  </span>
                  <span style={{ fontSize: '13px', color: '#a3a3a3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.summary}
                  </span>
                  <span style={{ fontSize: '11px', color: '#404040' }}>{r.type}</span>
                  <span style={{
                    fontSize: '11px', fontWeight: 500,
                    color: r.pri === 'HIGH' ? '#f87171' : r.pri === 'MEDIUM' ? '#fbbf24' : '#737373',
                  }}>{r.pri}</span>
                  <span style={{ fontSize: '12px', color: '#404040', fontFamily: 'Space Grotesk, sans-serif' }}>{r.sla}</span>
                  <span style={{
                    fontSize: '11px', padding: '2px 8px',
                    borderRadius: '4px', border: '1px solid #262626',
                    background: '#111111', color: '#a3a3a3',
                    fontFamily: 'Space Grotesk, sans-serif',
                  }}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PRODUCT FEATURES ── */}
      <section id="product" style={{ padding: '96px 48px', borderBottom: '1px solid #1a1a1a' }}>
        <SectionLabel>Product</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', alignItems: 'start' }}>
          <h2 style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontSize: 'clamp(32px, 4vw, 52px)',
            fontWeight: 700, lineHeight: 1.05,
            letterSpacing: '-0.025em', color: '#ffffff',
          }}>
            Everything a support team needs. Nothing it doesn't.
          </h2>
          <div>
            {[
              { title: 'AI-Assisted Intake', desc: 'The AI conducts the intake conversation, structures the issue, and proposes a resolution path — no agent input required.' },
              { title: 'Automated Classification', desc: 'Issue type, priority tier, and target department are determined in under two seconds with a confidence score attached.' },
              { title: 'Department Routing', desc: 'Reports move directly to the right department once a CDA approves. No manual assignment, no ambiguity.' },
              { title: 'Escalation Tracking', desc: 'Customers can escalate rejected reports to SuperAdmin with a full auto-generated case summary pre-attached.' },
              { title: 'Audit Timeline', desc: 'Every status change, every actor, every note — logged automatically. Immutable trail from intake to close.' },
              { title: 'Multi-Tenant Management', desc: 'Each business runs in a fully isolated context. Routing rules, departments, and AI personas configured per tenant.' },
            ].map((f, i) => <Feature key={f.title} {...f} index={i} />)}
          </div>
        </div>
      </section>

      {/* ── WORKFLOW ── */}
      <section id="workflow" style={{ padding: '96px 48px', borderBottom: '1px solid #1a1a1a', background: '#080808' }}>
        <SectionLabel>Workflow</SectionLabel>
        <h2 style={{
          fontFamily: 'Space Grotesk, sans-serif',
          fontSize: 'clamp(28px, 3vw, 44px)',
          fontWeight: 700, lineHeight: 1.1,
          letterSpacing: '-0.025em', color: '#ffffff',
          marginBottom: '64px', maxWidth: '480px',
        }}>
          From complaint to resolution. Structured, every time.
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>
          {[
            { label: 'Customer Intake', sub: 'AI-conducted conversation' },
            { label: 'Structured Report', sub: 'Classified & prioritised' },
            { label: 'CDA Review', sub: 'Approve / reject / request info' },
            { label: 'Department Action', sub: 'SLA-tracked resolution' },
            { label: 'Resolution', sub: 'Closed with full audit trail' },
          ].map((s, i, arr) => (
            <ProcessStep key={s.label} label={s.label} sub={s.sub} last={i === arr.length - 1} />
          ))}
        </div>
      </section>

      {/* ── ROLES ── */}
      <section id="roles" style={{ padding: '96px 48px', borderBottom: '1px solid #1a1a1a' }}>
        <SectionLabel>Roles</SectionLabel>
        <h2 style={{
          fontFamily: 'Space Grotesk, sans-serif',
          fontSize: 'clamp(28px, 3vw, 44px)',
          fontWeight: 700, lineHeight: 1.1,
          letterSpacing: '-0.025em', color: '#ffffff',
          marginBottom: '48px',
        }}>
          Four roles. Clear responsibilities.
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: '#1a1a1a', border: '1px solid #1a1a1a', borderRadius: '10px', overflow: 'hidden' }}>
          {[
            {
              role: 'Customer',
              abbr: 'CUS',
              desc: 'Raises issues through the AI chat interface. Tracks status, responds to info requests, and escalates rejected outcomes.',
              actions: ['Submit complaint', 'Track resolution', 'Escalate rejection'],
            },
            {
              role: 'CDA',
              abbr: 'CDA',
              desc: 'Central Desk Analyst. Reviews AI-generated reports, approves routing to departments, or requests additional information.',
              actions: ['Review reports', 'Approve to dept', 'Request info'],
            },
            {
              role: 'Dept Admin',
              abbr: 'DA',
              desc: 'Takes ownership of approved reports within their department. Resolves issues and logs actions against SLA deadlines.',
              actions: ['Action reports', 'Log resolution', 'Track SLA'],
            },
            {
              role: 'Super Admin',
              abbr: 'SA',
              desc: 'Final resolution authority. Handles escalated cases with full case summary and audit trail auto-attached.',
              actions: ['Handle escalations', 'Override decisions', 'Close cases'],
            },
          ].map(r => (
            <div key={r.role} style={{ background: '#000000', padding: '32px 28px' }}>
              <div style={{
                display: 'inline-block',
                fontFamily: 'Space Grotesk, sans-serif',
                fontSize: '10px', fontWeight: 600,
                letterSpacing: '0.1em', color: '#404040',
                border: '1px solid #1a1a1a', borderRadius: '3px',
                padding: '2px 7px', marginBottom: '16px',
              }}>
                {r.abbr}
              </div>
              <h3 style={{
                fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px',
                fontWeight: 600, color: '#ffffff', marginBottom: '10px',
                letterSpacing: '-0.01em',
              }}>
                {r.role}
              </h3>
              <p style={{ fontSize: '13px', color: '#737373', lineHeight: 1.6, marginBottom: '20px' }}>
                {r.desc}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {r.actions.map(a => (
                  <div key={a} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#404040', flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: '#a3a3a3' }}>{a}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '96px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '48px', flexWrap: 'wrap', borderBottom: '1px solid #1a1a1a' }}>
        <div>
          <h2 style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontSize: 'clamp(32px, 4vw, 56px)',
            fontWeight: 700, lineHeight: 1,
            letterSpacing: '-0.025em', color: '#ffffff', marginBottom: '12px',
          }}>
            Ready to get started?
          </h2>
          <p style={{ fontSize: '15px', color: '#737373' }}>
            Set up your team's workspace in minutes.
          </p>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          style={{
            padding: '13px 32px',
            background: '#ffffff', color: '#000000',
            border: 'none', borderRadius: '6px',
            fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500,
            cursor: 'pointer', transition: 'background 0.12s', whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#d4d4d4')}
          onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}
        >
          Create account →
        </button>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: '24px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '13px', color: '#404040', fontWeight: 500 }}>
          ZeroDesk
        </span>
        <span style={{ fontSize: '12px', color: '#303030' }}>
          AI-assisted support workflow
        </span>
      </footer>

      {/* Auth drawer */}
      <AuthDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .animate-fade-up { animation: fadeUp 0.5s ease both; }
        .d-100 { animation-delay: 100ms; }
        .d-200 { animation-delay: 200ms; }
        .d-300 { animation-delay: 300ms; }
        .d-500 { animation-delay: 500ms; }
      `}</style>
    </div>
  );
}