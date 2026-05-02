'use client';

import { useState, useEffect, useCallback } from 'react';
import { ReportQueue } from '@/components/dashboard/ReportQueue';
import { ReportItem, ReportRow } from '@/components/dashboard/ReportItem';
import { ActionPanel } from '@/components/dashboard/ActionPanel';
import { Toast, useToast } from '@/components/dashboard/Toast';

function getToken(): string {
  return typeof window !== 'undefined'
    ? (localStorage.getItem('access_token') ?? '')
    : '';
}

interface ApiReport {
  id: string;
  issueSummary: string;
  customer?: { name?: string };
  routeToDeptName: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  slaDeadline?: string | null;
  slaBreached?: boolean;
  status: string;
  createdAt: string;
}

interface ApiResponse {
  data: ApiReport[];
  total: number;
}

export default function DeptDashboard() {
  const { toasts, push, dismiss } = useToast();

  const [reports, setReports] = useState<ReportRow[]>([]);
  const [stats, setStats] = useState({ queue: 0, inProgress: 0, completedToday: 0, slaBreached: 0 });
  const [loading, setLoading] = useState(true);
  const [statsRefreshing, setStatsRefreshing] = useState(false);
  const [actionReportId, setActionReportId] = useState<string | null>(null);

  const fetchReports = useCallback(async (isStatRefresh = false) => {
    if (isStatRefresh) setStatsRefreshing(true);
    else setLoading(true);
    try {
      const token = getToken();
      const [queueRes, inProgRes, completedRes] = await Promise.all([
        fetch('http://localhost:3000/api/reports?status=APPROVED_TO_DEPT&limit=50', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:3000/api/reports?status=IN_PROGRESS&limit=1', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:3000/api/reports?status=COMPLETED&limit=50', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const queue: ApiResponse = await queueRes.json();
      const inProg: ApiResponse = await inProgRes.json();
      const completed: ApiResponse = await completedRes.json();

      const today = new Date().toDateString();
      const completedToday = completed.data.filter((r) => new Date(r.createdAt).toDateString() === today).length;
      const breached = queue.data.filter((r) => r.slaBreached).length;

      setStats({ queue: queue.total, inProgress: inProg.total, completedToday, slaBreached: breached });
      setReports(queue.data.map((r) => ({
        id: r.id, issueSummary: r.issueSummary, customerName: r.customer?.name,
        routeToDeptName: r.routeToDeptName, priority: r.priority,
        slaDeadline: r.slaDeadline, status: r.status, createdAt: r.createdAt,
      })));
    } catch {
      push('Failed to load reports', 'error');
    } finally {
      setLoading(false);
      setStatsRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const statCards = [
    { label: 'My Queue', value: stats.queue, color: '#6ee7b7' },
    { label: 'In Progress', value: stats.inProgress, color: '#60a5fa' },
    { label: 'Completed Today', value: stats.completedToday, color: '#a78bfa' },
    { label: 'SLA Breached', value: stats.slaBreached, color: '#f87171' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-100 p-6 font-sans">
      <div className="mb-8">
        <p className="text-xs text-[#6ee7b7] font-mono uppercase tracking-widest mb-1">ResolveIQ</p>
        <h1 className="text-2xl font-bold text-white">Department Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Dept Admin · Action Queue</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
        {statCards.map((s) => (
          <div key={s.label} className="bg-[#12121a] border border-slate-800/60 rounded-xl p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{s.label}</p>
            <p className="text-3xl font-bold" style={{ color: s.color }}>
              {statsRefreshing
                ? <span className="inline-block w-8 h-7 rounded bg-slate-800 animate-pulse align-middle" />
                : s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-4 mt-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Approved Queue</h2>
        <button
          onClick={() => fetchReports(true)}
          disabled={statsRefreshing}
          className="text-xs text-slate-500 hover:text-[#6ee7b7] transition-colors flex items-center gap-1 disabled:opacity-40"
        >
          <span className={statsRefreshing ? 'animate-spin inline-block' : ''}>↻</span>
          {statsRefreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <ReportQueue
        headers={['Report', 'Customer', 'Priority', 'SLA', 'Action']}
        reports={reports}
        loading={loading}
        emptyMsg="Queue is clear ✓"
        renderRow={(r) => (
          <ReportItem
            key={r.id}
            report={r}
            columns={['summary', 'customer', 'priority', 'sla']}
            actions={
              <button
                onClick={() => setActionReportId(r.id)}
                className="px-3 py-1.5 bg-[#6ee7b7]/10 text-[#6ee7b7] border border-[#6ee7b7]/30 text-xs font-semibold rounded-lg hover:bg-[#6ee7b7]/20 transition-colors"
              >
                Take Action
              </button>
            }
          />
        )}
      />

      {actionReportId && (
        <ActionPanel
          reportId={actionReportId}
          token={getToken()}
          onSuccess={() => {
            setActionReportId(null);
            push('Report resolved successfully ✓');
            fetchReports();
          }}
          onClose={() => setActionReportId(null)}
        />
      )}

      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}