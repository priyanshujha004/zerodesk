/* ───────────────────────────────────────────────────────────
   DEPT DASHBOARD
─────────────────────────────────────────────────────────── */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { ReportQueue } from '@/components/dashboard/ReportQueue';
import { ReportItem, ReportRow } from '@/components/dashboard/ReportItem';
import { ActionPanel } from '@/components/dashboard/ActionPanel';
import { Toast, useToast } from '@/components/dashboard/Toast';

function getToken() {
  return typeof window !== 'undefined' ? (localStorage.getItem('access_token') ?? '') : '';
}

interface ApiReport {
  id: string; issueSummary: string; customer?: { name?: string };
  routeToDeptName: string; priority: 'HIGH' | 'MEDIUM' | 'LOW';
  slaDeadline?: string | null; slaBreached?: boolean; status: string; createdAt: string;
}
interface ApiResponse { data: ApiReport[]; total: number; }

function Stat({ label, value, loading }: { label: string; value: number | string; loading: boolean }) {
  return (
    <div style={{ background: '#111111', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '18px 20px' }}>
      <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#404040', marginBottom: '8px' }}>{label}</p>
      {loading
        ? <div style={{ width: '48px', height: '28px', background: '#1a1a1a', borderRadius: '4px', animation: 'pulse 1.5s ease infinite' }} />
        : <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '28px', fontWeight: 600, letterSpacing: '-0.02em', color: '#ffffff' }}>{value}</p>
      }
    </div>
  );
}

export function DeptDashboard() {
  const { toasts, push, dismiss } = useToast();
  const [reports, setReports]       = useState<ReportRow[]>([]);
  const [stats, setStats]           = useState({ queue: 0, inProgress: 0, completedToday: 0, slaBreached: 0 });
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId]     = useState<string | null>(null);

  const fetch_ = useCallback(async (stat = false) => {
    stat ? setRefreshing(true) : setLoading(true);
    try {
      const h = { Authorization: `Bearer ${getToken()}` };
      const [qR, iR, cR] = await Promise.all([
        fetch('/api/reports?status=APPROVED_TO_DEPT&limit=50', { headers: h }),
        fetch('/api/reports?status=IN_PROGRESS&limit=1',      { headers: h }),
        fetch('/api/reports?status=COMPLETED&limit=50',       { headers: h }),
      ]);
      const [q, i, c]: ApiResponse[] = await Promise.all([qR.json(), iR.json(), cR.json()]);
      const today = new Date().toDateString();
      setStats({
        queue: q.total, inProgress: i.total,
        completedToday: c.data.filter(r => new Date(r.createdAt).toDateString() === today).length,
        slaBreached: q.data.filter(r => r.slaBreached).length,
      });
      setReports(q.data.map(r => ({ id: r.id, issueSummary: r.issueSummary, customerName: r.customer?.name, routeToDeptName: r.routeToDeptName, priority: r.priority, slaDeadline: r.slaDeadline, status: r.status, createdAt: r.createdAt })));
    } catch { push('Failed to load', 'error'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [push]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return (
    <>
      <div style={{ marginBottom: '28px' }}>
        <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#404040', marginBottom: '6px' }}>ZeroDesk / Dept</p>
        <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em', color: '#ffffff', marginBottom: '3px' }}>Department Queue</h1>
        <p style={{ fontSize: '13px', color: '#737373' }}>Take action on approved reports</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '28px' }}>
        <Stat label="Queue"           value={stats.queue}          loading={refreshing} />
        <Stat label="In progress"     value={stats.inProgress}     loading={refreshing} />
        <Stat label="Completed today" value={stats.completedToday} loading={refreshing} />
        <Stat label="SLA breached"    value={stats.slaBreached}    loading={refreshing} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#404040' }}>Approved queue</p>
        <button onClick={() => fetch_(true)} disabled={refreshing}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#404040', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '5px', transition: 'color 0.1s' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
          onMouseLeave={e => (e.currentTarget.style.color = '#404040')}
        >
          <span style={{ display: 'inline-block', animation: refreshing ? 'spin 0.6s linear infinite' : 'none' }}>↻</span>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <ReportQueue
        headers={['Report', 'Customer', 'Priority', 'SLA', 'Action']}
        reports={reports} loading={loading} emptyMsg="Queue is clear"
        renderRow={r => (
          <ReportItem key={r.id} report={r} columns={['summary', 'customer', 'priority', 'sla']}
            actions={
              <button onClick={() => setActionId(r.id)}
                style={{ padding: '5px 12px', background: '#111111', border: '1px solid #262626', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', color: '#ffffff', fontFamily: 'Inter, sans-serif', fontWeight: 500, transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1a1a1a')}
                onMouseLeave={e => (e.currentTarget.style.background = '#111111')}
              >
                Take action
              </button>
            }
          />
        )}
      />

      {actionId && (
        <ActionPanel reportId={actionId} token={getToken()}
          onSuccess={() => { setActionId(null); push('Resolved ✓'); fetch_(); }}
          onClose={() => setActionId(null)}
        />
      )}
      <Toast toasts={toasts} onDismiss={dismiss} />
      <style>{`@keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.3;}} @keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </>
  );
}
export default DeptDashboard;