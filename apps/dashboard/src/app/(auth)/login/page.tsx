'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const ROLE_ROUTES: Record<string, string> = {
  CDA:         '/dashboard/cda',
  DEPT_ADMIN:  '/dashboard/dept',
  SUPER_ADMIN: '/dashboard/superadmin',
  CUSTOMER:    '/chat',
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError('Both fields required.'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(d.message ?? 'Invalid credentials');
      }
      const data = await res.json() as { accessToken?: string; role?: string };
      if (data.accessToken) localStorage.setItem('access_token', data.accessToken);
      const route = ROLE_ROUTES[data.role ?? ''] ?? '/dashboard/cda';
      router.push(route);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        fontFamily: 'var(--font-body)',
      }}
    >
      {/* Left — branding panel */}
      <div
        className="grid-bg"
        style={{
          background: 'var(--bg-2)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 56px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0, right: 0,
            width: '200px', height: '200px',
            background: 'radial-gradient(circle at top right, var(--acid-glow) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--acid)', letterSpacing: '0.1em', marginBottom: '64px' }}>
            ZeroDesk
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '48px', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.02em', color: 'var(--text-1)', marginBottom: '20px' }}>
            Support ops.<br />
            <span style={{ color: 'var(--acid)' }}>Simplified.</span>
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '15px', maxWidth: '320px', lineHeight: 1.7 }}>
            AI-assisted complaint intake, routing, and resolution. Humans in control at every decision point.
          </p>
        </div>

        {/* Role legend */}
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>
            ROLE ACCESS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { role: 'CUSTOMER',    color: 'var(--indigo)', desc: 'Raise & track complaints' },
              { role: 'CDA',         color: 'var(--acid)',   desc: 'Review & route reports' },
              { role: 'DEPT ADMIN',  color: 'var(--cyan)',   desc: 'Resolve department queue' },
              { role: 'SUPER ADMIN', color: 'var(--amber)',  desc: 'Handle escalations' },
            ].map((r) => (
              <div key={r.role} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: r.color, background: `${r.color}1a`, border: `1px solid ${r.color}40`, padding: '2px 8px', borderRadius: '4px', minWidth: '96px', textAlign: 'center', letterSpacing: '0.05em' }}>
                  {r.role}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>{r.desc}</span>
              </div>
            ))}
          </div>

          {/* Demo credentials — kept from upstream */}
          <div style={{ marginTop: '24px', padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
              DEMO CREDENTIALS
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--acid)' }}>
              superadmin@shopease.com
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>
              Test@1234
            </div>
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 56px' }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px', letterSpacing: '-0.01em' }}>
              Sign in
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: '14px' }}>Access your dashboard</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label className="label" style={{ display: 'block', marginBottom: '6px' }}>Email address</label>
              <input className="input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div>
              <label className="label" style={{ display: 'block', marginBottom: '6px' }}>Password</label>
              <input className="input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </div>

            {error && (
              <div style={{ padding: '10px 14px', background: 'rgba(255,92,92,0.08)', border: '1px solid rgba(255,92,92,0.25)', borderRadius: '8px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--red)' }}>
                ⚠ {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: '14px', opacity: loading ? 0.6 : 1, marginTop: '4px' }}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '14px', height: '14px', border: '2px solid var(--bg)', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.6s linear infinite' }} />
                  Signing in…
                </span>
              ) : 'Sign in →'}
            </button>
          </form>

          <div style={{ marginTop: '24px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)' }}>
            No account?{' '}
            <Link href="/register" style={{ color: 'var(--acid)', textDecoration: 'none' }}>Register →</Link>
          </div>
          <div style={{ marginTop: '40px', textAlign: 'center' }}>
            <Link href="/" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', textDecoration: 'none' }}>
              ← Back to ZeroDesk
            </Link>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}