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
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(d.message ?? 'Registration failed');
      }
      router.push('/login?registered=1');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'grid', gridTemplateColumns: '1fr 1fr', fontFamily: 'var(--font-body)' }}>
      {/* Left — decorative */}
      <div
        className="grid-bg"
        style={{ background: 'var(--bg-2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 56px', position: 'relative', overflow: 'hidden' }}
      >
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '300px', height: '300px', background: 'radial-gradient(circle at bottom left, rgba(124,108,255,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--acid)', letterSpacing: '0.1em', marginBottom: '48px' }}>
          ZeroDesk
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '44px', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.02em', color: 'var(--text-1)', marginBottom: '20px' }}>
          Join the<br /><span style={{ color: 'var(--indigo)' }}>platform.</span>
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: '15px', maxWidth: '320px', lineHeight: 1.7, marginBottom: '48px' }}>
          Create your account and get access to AI-powered complaint management.
        </p>

        {[
          'AI-assisted intake — no manual classification',
          'Real-time SLA tracking across all reports',
          'Full audit trail — every action logged',
          'Role-based access for your entire team',
        ].map((item) => (
          <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
            <span style={{ color: 'var(--acid)', fontFamily: 'var(--font-mono)', fontSize: '12px', marginTop: '2px', flexShrink: 0 }}>✓</span>
            <span style={{ color: 'var(--text-2)', fontSize: '13px', lineHeight: 1.5 }}>{item}</span>
          </div>
        ))}
      </div>

      {/* Right — form */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 56px' }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>
          <div style={{ marginBottom: '36px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px', letterSpacing: '-0.01em' }}>
              Create account
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: '14px' }}>Customer access by default</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { k: 'name'    as const, label: 'Full name',         type: 'text',     placeholder: 'Rohan Sharma' },
              { k: 'email'   as const, label: 'Email address',     type: 'email',    placeholder: 'you@example.com' },
              { k: 'password'as const, label: 'Password',          type: 'password', placeholder: '8+ characters' },
              { k: 'confirm' as const, label: 'Confirm password',  type: 'password', placeholder: 'Repeat password' },
            ].map(({ k, label, type, placeholder }) => (
              <div key={k}>
                <label className="label" style={{ display: 'block', marginBottom: '6px' }}>{label}</label>
                <input className="input" type={type} placeholder={placeholder} value={form[k]} onChange={set(k)} autoComplete={k === 'email' ? 'email' : k === 'name' ? 'name' : 'new-password'} />
              </div>
            ))}

            {error && (
              <div style={{ padding: '10px 14px', background: 'rgba(255,92,92,0.08)', border: '1px solid rgba(255,92,92,0.25)', borderRadius: '8px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--red)' }}>
                ⚠ {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: '14px', opacity: loading ? 0.6 : 1, marginTop: '4px' }}>
              {loading ? 'Creating account…' : 'Create account →'}
            </button>
          </form>

          <div style={{ marginTop: '24px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--acid)', textDecoration: 'none' }}>Sign in →</Link>
          </div>
          <div style={{ marginTop: '40px', textAlign: 'center' }}>
            <Link href="/" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', textDecoration: 'none' }}>
              ← Back to ZeroDesk
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}