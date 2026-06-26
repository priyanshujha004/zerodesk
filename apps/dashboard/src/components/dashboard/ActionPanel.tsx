'use client';

import { useState } from 'react';

interface Props {
  reportId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function ActionPanel({ reportId, onSuccess, onClose }: Props) {
  const [note, setNote]             = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  async function submit() {
    if (!note.trim() || !actionTaken.trim()) { setError('Both fields are required.'); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/workflow/action/${reportId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ note, actionTaken }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(err.message ?? 'Request failed');
      }
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally { setLoading(false); }
  }

  const inp: React.CSSProperties = {
    width: '100%', background: '#0a0a0a', border: '1px solid #262626',
    borderRadius: '6px', padding: '10px 12px', fontSize: '13px',
    color: '#ffffff', outline: 'none', resize: 'none' as const,
    fontFamily: 'Inter, sans-serif', transition: 'border-color 0.12s',
  };
  const lbl: React.CSSProperties = {
    fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em',
    textTransform: 'uppercase', color: '#404040', display: 'block', marginBottom: '6px',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 200, padding: '20px',
    }} onClick={onClose}>
      <div style={{
        background: '#111111', border: '1px solid #262626', borderRadius: '10px',
        padding: '24px', width: '100%', maxWidth: '420px',
        boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
      }} onClick={e => e.stopPropagation()}>
        <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', fontWeight: 600, color: '#ffffff', marginBottom: '20px' }}>
          Take Action
        </p>

        <label style={lbl}>Resolution Note</label>
        <textarea
          style={{ ...inp, marginBottom: '14px' }}
          rows={3} placeholder="Describe what was done…"
          value={note} onChange={e => setNote(e.target.value)}
          onFocus={e => (e.target.style.borderColor = '#404040')}
          onBlur={e => (e.target.style.borderColor = '#262626')}
        />

        <label style={lbl}>Action Taken</label>
        <input
          style={{ ...inp, marginBottom: '20px' }}
          type="text" placeholder="e.g. Refund processed, Account updated…"
          value={actionTaken} onChange={e => setActionTaken(e.target.value)}
          onFocus={e => (e.target.style.borderColor = '#404040')}
          onBlur={e => (e.target.style.borderColor = '#262626')}
        />

        {error && (
          <div style={{
            padding: '8px 12px', marginBottom: '16px',
            background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: '5px', fontSize: '12px', color: '#f87171',
          }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '8px 16px', background: 'transparent', border: '1px solid #262626',
            borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#737373',
            fontFamily: 'Inter, sans-serif',
          }}>Cancel</button>
          <button onClick={submit} disabled={loading} style={{
            padding: '8px 20px', background: loading ? '#1a1a1a' : '#ffffff',
            color: '#000000', border: 'none', borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 500,
            opacity: loading ? 0.6 : 1, transition: 'background 0.12s',
          }}>
            {loading ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}