'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ReportQueue } from '@/components/dashboard/ReportQueue';
import { ReportItem, ReportRow } from '@/components/dashboard/ReportItem';
import { Toast, useToast } from '@/components/dashboard/Toast';

interface ApiReport {
  id: string; issueSummary: string; customer?: { name?: string };
  routeToDeptName: string; priority: 'HIGH' | 'MEDIUM' | 'LOW';
  slaDeadline?: string | null; status: string;
  escalationCount?: number; escalations?: { escalationReason?: string }[];
  createdAt: string; updatedAt: string;
}
interface ApiResponse { data: ApiReport[]; total: number; }

function Stat({ label, value, accent, loading }: { label: string; value: number | string; accent: string; loading: boolean }) {
  return (
    <div style={{ background: '#080808', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '18px 20px' }}>
      <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#333333', marginBottom: '8px', fontFamily: 'Space Grotesk, sans-serif' }}>{label}</p>
      {loading
        ? <div style={{ width: '48px', height: '28px', background: '#111111', borderRadius: '4px', animation: 'pulse 1.5s ease infinite' }} />
        : <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '30px', fontWeight: 600, letterSpacing: '-0.02em', color: accent }}>{value}</p>
      }
    </div>
  );
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { toasts, push, dismiss } = useToast();
  const [reports, setReports]       = useState<ReportRow[]>([]);
  const [stats, setStats]           = useState({ totalEscalated: 0, resolvedToday: 0, closedToday: 0, avgHours: 0 });
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (stat = false) => {
    stat ? setRefreshing(true) : setLoading(true);
    try {
      const opts: RequestInit = { credentials: 'include' };
      const [eR, rR, cR] = await Promise.all([
        fetch('/api/reports?status=ESCALATED&limit=50', opts),
        fetch('/api/reports?status=RESOLVED&limit=50', opts),
        fetch('/api/reports?status=CLOSED&limit=50', opts),
      ]);
      const [e, r, c]: ApiResponse[] = await Promise.all([eR.json(), rR.json(), cR.json()]);
      const today = new Date().toDateString();
      const all = [...r.data, ...c.data];
      const avgMs = all.length ? all.reduce((a, x) => a + (new Date(x.updatedAt).getTime() - new Date(x.createdAt).getTime()), 0) / all.length : 0;
      setStats({
        totalEscalated: e.total,
        resolvedToday: r.data.filter(x => new Date(x.updatedAt).toDateString() === today).length,
        closedToday:   c.data.filter(x => new Date(x.updatedAt).toDateString() === today).length,
        avgHours: Math.round(avgMs / 3600000),
      });
      setReports(e.data.map(x => ({ id: x.id, issueSummary: x.issueSummary, customerName: x.customer?.name, routeToDeptName: x.routeToDeptName, priority: x.priority, slaDeadline: x.slaDeadline, status: x.status, escalationCount: x.escalationCount, escalationReason: x.escalations?.[0]?.escalationReason, createdAt: x.createdAt })));
    } catch { push('Failed to load', 'error'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [push]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div style={{ marginBottom: '28px' }}>
        <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#333333', marginBottom: '6px', fontFamily: 'Space Grotesk, sans-serif' }}>ZeroDesk / SuperAdmin</p>
        <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em', color: '#ffffff', marginBottom: '3px' }}>Escalation Center</h1>
        <p style={{ fontSize: '13px', color: '#737373' }}>Final resolution authority</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '28px' }}>
        <Stat label="Escalated"      value={stats.totalEscalated}  accent="#fb923c" loading={refreshing} />
        <Stat label="Resolved today" value={stats.resolvedToday}   accent="#34d399" loading={refreshing} />
        <Stat label="Closed today"   value={stats.closedToday}     accent="#38bdf8" loading={refreshing} />
        <Stat label="Avg resolution" value={`${stats.avgHours}h`}  accent="#818cf8" loading={refreshing} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#333333', fontFamily: 'Space Grotesk, sans-serif' }}>Escalated reports</p>
        <button onClick={() => load(true)} disabled={refreshing} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#404040', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '5px' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
          onMouseLeave={e => (e.currentTarget.style.color = '#404040')}
        >
          <span style={{ display: 'inline-block', animation: refreshing ? 'spin 0.6s linear infinite' : 'none' }}>↻</span>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <ReportQueue
        headers={['Report', 'Escalation', 'Customer', 'Level', 'Created']}
        reports={reports} loading={loading} emptyMsg="No escalations pending ✓"
        renderRow={r => (
          <ReportItem key={r.id} report={r} columns={['summary', 'escalation', 'customer', 'created']} onClick={() => router.push(`/report/${r.id}`)} />
        )}
      />

      <Toast toasts={toasts} onDismiss={dismiss} />
      <style>{`@keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.3;}} @keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </>
  );
}