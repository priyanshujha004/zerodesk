<<<<<<< Updated upstream



'use client';

import { useState } from 'react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

=======
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { setError('All fields required.'); return; }
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true); setError(null);
>>>>>>> Stashed changes
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
<<<<<<< Updated upstream
        body: JSON.stringify({ email, password, name }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? 'Registration failed');
      }

      window.location.href = '/chat';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
=======
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(d.message ?? 'Registration failed');
      }
      router.push('/login?registered=1');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed');
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
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-accent2/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-accent/10 rounded-full blur-[120px]" />
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
            Create your account
          </p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-surface/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-8 shadow-2xl shadow-black/40"
        >
          <h1 className="text-xl font-semibold text-white mb-6">
            Register
          </h1>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="reg-name" className="block text-sm font-medium text-slate-300 mb-1.5">
                Full Name
              </label>
              <input
                id="reg-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white placeholder-slate-500 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
                placeholder="Jane Doe"
              />
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-slate-300 mb-1.5">
                Email
              </label>
              <input
                id="reg-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white placeholder-slate-500 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <input
                id="reg-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white placeholder-slate-500 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
                placeholder="Min 8 characters"
              />
            </div>

            <div>
              <label htmlFor="reg-confirm" className="block text-sm font-medium text-slate-300 mb-1.5">
                Confirm Password
              </label>
              <input
                id="reg-confirm"
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
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
                Creating account…
              </span>
            ) : (
              'Create account'
            )}
          </button>

          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <a href="/login" className="text-accent hover:text-accent/80 transition-colors font-medium">
              Sign in
            </a>
          </p>
        </form>
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
      {/* Left — decorative */}
      <div
        className="grid-bg"
        style={{
          background: 'var(--bg-2)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '48px 56px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: 0, left: 0,
            width: '300px', height: '300px',
            background: 'radial-gradient(circle at bottom left, rgba(124,108,255,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            color: 'var(--acid)',
            letterSpacing: '0.1em',
            marginBottom: '48px',
          }}
        >
          ZeroDesk
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '44px',
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            color: 'var(--text-1)',
            marginBottom: '20px',
          }}
        >
          Join the<br />
          <span style={{ color: 'var(--indigo)' }}>platform.</span>
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: '15px', maxWidth: '320px', lineHeight: 1.7, marginBottom: '48px' }}>
          Create your account and get access to AI-powered complaint management.
        </p>

        {/* Capability checklist */}
        {[
          'AI-assisted intake — no manual classification',
          'Real-time SLA tracking across all reports',
          'Full audit trail — every action logged',
          'Role-based access for your entire team',
        ].map((item) => (
          <div
            key={item}
            style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}
          >
            <span style={{ color: 'var(--acid)', fontFamily: 'var(--font-mono)', fontSize: '12px', marginTop: '2px', flexShrink: 0 }}>
              ✓
            </span>
            <span style={{ color: 'var(--text-2)', fontSize: '13px', lineHeight: 1.5 }}>{item}</span>
          </div>
        ))}
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
          <div style={{ marginBottom: '36px' }}>
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
              Create account
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: '14px' }}>
              Customer access by default
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { k: 'name' as const, label: 'Full name', type: 'text', placeholder: 'Rohan Sharma' },
              { k: 'email' as const, label: 'Email address', type: 'email', placeholder: 'you@example.com' },
              { k: 'password' as const, label: 'Password', type: 'password', placeholder: '8+ characters' },
              { k: 'confirm' as const, label: 'Confirm password', type: 'password', placeholder: 'Repeat password' },
            ].map(({ k, label, type, placeholder }) => (
              <div key={k}>
                <label className="label" style={{ display: 'block', marginBottom: '6px' }}>
                  {label}
                </label>
                <input
                  className="input"
                  type={type}
                  placeholder={placeholder}
                  value={form[k]}
                  onChange={set(k)}
                  autoComplete={k === 'email' ? 'email' : k === 'name' ? 'name' : 'new-password'}
                />
              </div>
            ))}

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
              {loading ? 'Creating account…' : 'Create account →'}
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
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--acid)', textDecoration: 'none' }}>
              Sign in →
            </Link>
          </div>

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
    </div>
  );
}
>>>>>>> Stashed changes
