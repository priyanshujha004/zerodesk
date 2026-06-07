'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ReportQueue } from '@/components/dashboard/ReportQueue';
import { ReportItem, ReportRow } from '@/components/dashboard/ReportItem';
import { Toast, useToast } from '@/components/dashboard/Toast';

function getToken() {
  return typeof window !== 'undefined' ? (localStorage.getItem('access_token') ?? '') : '';
}

interface ApiReport {
  id: string; issueSummary: string;
  customer?: { name?: string }; routeToDeptName: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  slaDeadline?: string | null; status: string; createdAt: string;
}
interface ApiResponse { data: ApiReport[]; total: number; }

/* ── Stat card ── */
function Stat({ label, value, loading }: { label: string; value: number; loading: boolean }) {
  return (
    <div style={{
      background: '#111111', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '18px 20px',
    }}>
      <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#404040', marginBottom: '8px' }}>
        {label}
      </p>
      {loading
        ? <div style={{ width: '48px', height: '28px', background: '#1a1a1a', borderRadius: '4px', animation: 'pulse 1.5s ease infinite' }} />
        : <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '28px', fontWeight: 600, letterSpacing: '-0.02em', color: '#ffffff' }}>
            {value}
          </p>
      }
    </div>
  );
}

/* ── Reject modal ── */
function RejectModal({ reportId, onConfirm, onClose }: { reportId: string; onConfirm: (n: string) => Promise<void>; onClose: () => void; }) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!note.trim()) { setErr('Reason required.'); return; }
    setLoading(true); setErr(null);
    try { await onConfirm(note); } catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); setLoading(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }} onClick={onClose}>
      <div style={{ background: '#111111', border: '1px solid #262626', borderRadius: '10px', padding: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 24px 48px rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()}>
        <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', fontWeight: 600, color: '#f87171', marginBottom: '4px' }}>Reject report</p>
        <p style={{ fontSize: '12px', color: '#404040', marginBottom: '20px', fontFamily: 'Space Grotesk, sans-serif' }}>#{reportId.slice(-8).toUpperCase()}</p>
        <label style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#404040', display: 'block', marginBottom: '6px' }}>
          Rejection reason <span style={{ color: '#f87171' }}>*</span>
        </label>
        <textarea
          value={note} onChange={e => setNote(e.target.value)} rows={3} autoFocus
          placeholder="Explain the rejection…"
          style={{ width: '100%', background: '#0a0a0a', border: '1px solid #262626', borderRadius: '6px', padding: '10px 12px', fontSize: '13px', color: '#ffffff', outline: 'none', resize: 'none', fontFamily: 'Inter, sans-serif', marginBottom: '16px' }}
        />
        {err && <p style={{ fontSize: '12px', color: '#f87171', marginBottom: '12px', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '5px', padding: '8px 12px' }}>{err}</p>}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #262626', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#737373', fontFamily: 'Inter, sans-serif' }}>Cancel</button>
          <button onClick={submit} disabled={loading} style={{ padding: '8px 16px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#f87171', fontFamily: 'Inter, sans-serif', opacity: loading ? 0.5 : 1 }}>
            {loading ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CdaDashboard() {
  const router = useRouter();
  const { toasts, push, dismiss } = useToast();
  const [reports, setReports]     = useState<ReportRow[]>([]);
  const [stats, setStats]         = useState({ pending: 0, approved: 0, rejected: 0, escalated: 0 });
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModal, setRejectModal]     = useState<string | null>(null);

  const fetch_ = useCallback(async (stat = false) => {
    stat ? setRefreshing(true) : setLoading(true);
    try {
      const h = { Authorization: `Bearer ${getToken()}` };
      const [pR, aR, rR, eR] = await Promise.all([
        fetch('/api/reports?status=PENDING_CDA&limit=50',      { headers: h }),
        fetch('/api/reports?status=APPROVED_TO_DEPT&limit=1',  { headers: h }),
        fetch('/api/reports?status=REJECTED&limit=1',          { headers: h }),
        fetch('/api/reports?status=ESCALATED&limit=1',         { headers: h }),
      ]);
      const [p, a, r, e]: ApiResponse[] = await Promise.all([pR.json(), aR.json(), rR.json(), eR.json()]);
      setStats({ pending: p.total, approved: a.total, rejected: r.total, escalated: e.total });
      setReports(p.data.map(r => ({ id: r.id, issueSummary: r.issueSummary, customerName: r.customer?.name, routeToDeptName: r.routeToDeptName, priority: r.priority, slaDeadline: r.slaDeadline, status: r.status, createdAt: r.createdAt })));
    } catch { push('Failed to load', 'error'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [push]);

  useEffect(() => { fetch_(); }, [fetch_]);

  async function approve(id: string) {
    setActionLoading(id + ':a');
    try {
      const res = await fetch(`/api/workflow/approve/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }, body: '{}' });
      if (!res.ok) throw new Error(((await res.json()) as { message?: string }).message ?? 'Failed');
      push('Approved ✓'); fetch_();
    } catch (e) { push(e instanceof Error ? e.message : 'Failed', 'error'); }
    finally { setActionLoading(null); }
  }

  async function reject(id: string, note: string) {
    const res = await fetch(`/api/workflow/reject/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ note }) });
    if (!res.ok) throw new Error(((await res.json()) as { message?: string }).message ?? 'Failed');
    push('Rejected ✓'); setRejectModal(null); fetch_();
  }

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#404040', marginBottom: '6px' }}>
          ZeroDesk / CDA
        </p>
        <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em', color: '#ffffff', marginBottom: '3px' }}>
          CDA Queue
        </h1>
        <p style={{ fontSize: '13px', color: '#737373' }}>Review and route incoming reports</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '28px' }}>
        <Stat label="Pending review" value={stats.pending}   loading={refreshing} />
        <Stat label="Approved"       value={stats.approved}  loading={refreshing} />
        <Stat label="Rejected"       value={stats.rejected}  loading={refreshing} />
        <Stat label="Escalated"      value={stats.escalated} loading={refreshing} />
      </div>

      {/* Queue label + refresh */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#404040' }}>
          Pending review
        </p>
        <button onClick={() => fetch_(true)} disabled={refreshing}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#404040', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 8px', borderRadius: '4px', transition: 'color 0.1s' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
          onMouseLeave={e => (e.currentTarget.style.color = '#404040')}
        >
          <span style={{ display: 'inline-block', animation: refreshing ? 'spin 0.6s linear infinite' : 'none' }}>↻</span>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <ReportQueue
        headers={['Report', 'Customer', 'Department', 'Priority', 'SLA', 'Actions']}
        reports={reports} loading={loading} emptyMsg="No pending reports"
        renderRow={r => (
          <ReportItem
            key={r.id} report={r}
            columns={['summary', 'customer', 'dept', 'priority', 'sla']}
            onClick={() => router.push(`/report/${r.id}`)}
            actions={
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => approve(r.id)} disabled={actionLoading === r.id + ':a'}
                  style={{ padding: '5px 12px', background: '#111111', border: '1px solid #262626', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', color: '#ffffff', fontFamily: 'Inter, sans-serif', fontWeight: 500, transition: 'all 0.1s', opacity: actionLoading === r.id + ':a' ? 0.4 : 1 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#1a1a1a'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#111111'; }}
                >
                  {actionLoading === r.id + ':a' ? '…' : 'Approve'}
                </button>
                <button
                  onClick={() => setRejectModal(r.id)}
                  style={{ padding: '5px 12px', background: 'transparent', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', color: '#f87171', fontFamily: 'Inter, sans-serif', transition: 'all 0.1s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(248,113,113,0.06)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  Reject
                </button>
              </div>
            }
          />
        )}
      />

      {rejectModal && <RejectModal reportId={rejectModal} onConfirm={n => reject(rejectModal, n)} onClose={() => setRejectModal(null)} />}
      <Toast toasts={toasts} onDismiss={dismiss} />
      <style>{`@keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.3;}} @keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </>
  );
}