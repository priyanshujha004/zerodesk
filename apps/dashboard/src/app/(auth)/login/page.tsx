'use client';

import { useState } from 'react';
<<<<<<< Updated upstream
import type { Role } from '../../../types';

const ROLE_ROUTES: Record<Role, string> = {
  CUSTOMER: '/chat',
  CDA: '/dashboard/cda',
  DEPT_ADMIN: '/dashboard/dept',
  SUPER_ADMIN: '/dashboard/superadmin',
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

=======
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const ROLE_ROUTES: Record<string, string> = {
  CDA:        '/dashboard/cda',
  DEPT_ADMIN: '/dashboard/dept',
  SUPER_ADMIN: '/dashboard/superadmin',
  CUSTOMER:   '/chat',
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
>>>>>>> Stashed changes
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
<<<<<<< Updated upstream

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? 'Invalid credentials');
      }

      const { user } = await res.json();
      const role = user.role as Role;
      window.location.href = ROLE_ROUTES[role] ?? '/chat';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
=======
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
>>>>>>> Stashed changes
    } finally {
      setLoading(false);
    }
  }

  return (
<<<<<<< Updated upstream
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] px-4">
      {/* Background glow effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-accent/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent2/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent2 flex items-center justify-center">
              <span className="text-[#0a0a0f] font-bold text-lg">R</span>
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">
              Resolve<span className="text-accent">IQ</span>
            </span>
          </div>
          <p className="text-slate-400 text-sm">
            AI-powered support resolution
          </p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-surface/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-8 shadow-2xl shadow-black/40"
        >
          <h1 className="text-xl font-semibold text-white mb-6">
            Sign in to your account
          </h1>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-slate-300 mb-1.5">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white placeholder-slate-500 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white placeholder-slate-500 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full py-2.5 rounded-lg bg-gradient-to-r from-accent to-emerald-400 text-[#0a0a0f] font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in…
              </span>
            ) : (
              'Sign in'
            )}
          </button>

          {/* <p className="mt-6 text-center text-sm text-slate-400">
            Don&apos;t have an account?{' '}
            <a href="/register" className="text-accent hover:text-accent/80 transition-colors font-medium">
              Register
            </a>
          </p> */}
        </form>

        {/* Footer hint */}
        <p className="mt-6 text-center text-xs text-slate-600">
          Demo: superadmin@shopease.com / Test@1234
        </p>
      </div>
    </div>
  );
}
=======
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
        {/* Corner accent */}
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
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              color: 'var(--acid)',
              letterSpacing: '0.1em',
              marginBottom: '64px',
            }}
          >
            ZeroDesk
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '48px',
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: 'var(--text-1)',
              marginBottom: '20px',
            }}
          >
            Support ops.<br />
            <span style={{ color: 'var(--acid)' }}>Simplified.</span>
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '15px', maxWidth: '320px', lineHeight: 1.7 }}>
            AI-assisted complaint intake, routing, and resolution. Humans in control at every decision point.
          </p>
        </div>

        {/* Role legend */}
        <div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--text-3)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
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
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: r.color,
                    background: `${r.color}1a`,
                    border: `1px solid ${r.color}40`,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    minWidth: '96px',
                    textAlign: 'center',
                    letterSpacing: '0.05em',
                  }}
                >
                  {r.role}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>
                  {r.desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 56px',
        }}
      >
        <div style={{ width: '100%', maxWidth: '380px' }}>
          <div style={{ marginBottom: '40px' }}>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '28px',
                fontWeight: 700,
                color: 'var(--text-1)',
                marginBottom: '8px',
                letterSpacing: '-0.01em',
              }}
            >
              Sign in
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: '14px' }}>
              Access your dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label
                className="label"
                style={{ display: 'block', marginBottom: '6px' }}
              >
                Email address
              </label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label className="label">Password</label>
              </div>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  background: 'rgba(255,92,92,0.08)',
                  border: '1px solid rgba(255,92,92,0.25)',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  color: 'var(--red)',
                }}
              >
                ⚠ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '13px',
                fontSize: '14px',
                opacity: loading ? 0.6 : 1,
                marginTop: '4px',
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '14px', height: '14px',
                      border: '2px solid var(--bg)',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'spin 0.6s linear infinite',
                    }}
                  />
                  Signing in…
                </span>
              ) : 'Sign in →'}
            </button>
          </form>

          <div
            style={{
              marginTop: '24px',
              textAlign: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--text-3)',
            }}
          >
            No account?{' '}
            <Link
              href="/register"
              style={{ color: 'var(--acid)', textDecoration: 'none' }}
            >
              Register →
            </Link>
          </div>

          {/* Back to landing */}
          <div style={{ marginTop: '40px', textAlign: 'center' }}>
            <Link
              href="/"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--text-3)',
                textDecoration: 'none',
              }}
            >
              ← Back to ZeroDesk
            </Link>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
>>>>>>> Stashed changes
