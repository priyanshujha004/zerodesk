'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ReportQueue } from '@/components/dashboard/ReportQueue';
import { ReportItem, ReportRow } from '@/components/dashboard/ReportItem';
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
  status: string;
  createdAt: string;
}

interface ApiResponse {
  data: ApiReport[];
  total: number;
}

interface RejectModalProps {
  reportId: string;
  onConfirm: (note: string) => Promise<void>;
  onClose: () => void;
}

function RejectModal({ reportId, onConfirm, onClose }: RejectModalProps) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!note.trim()) { setError('Rejection reason is required.'); return; }
    setLoading(true);
    setError(null);
    try {
      await onConfirm(note);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reject');
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-[#12121a] border border-slate-700/60 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-red-400 font-semibold text-lg mb-1">Reject Report</h2>
        <p className="text-xs text-slate-500 mb-4 font-mono">#{reportId.slice(-8).toUpperCase()}</p>
        <label className="block text-xs text-slate-500 mb-1 uppercase tracking-wider">
          Rejection Reason <span className="text-red-500">*</span>
        </label>
        <textarea
          className="w-full bg-[#0a0a0f] border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-500/50 mb-4 resize-none"
          rows={3}
          placeholder="Explain why this report is being rejected…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          autoFocus
        />
        {error && (
          <p className="text-red-400 text-xs mb-3 bg-red-900/20 border border-red-800/40 rounded px-3 py-2">
            {error}
          </p>
        )}
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="px-5 py-2 bg-red-500/20 text-red-400 border border-red-500/30 text-sm font-semibold rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
          >
            {loading ? 'Rejecting…' : 'Reject Report'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CdaDashboard() {
  const router = useRouter();
  const { toasts, push, dismiss } = useToast();

  const [reports, setReports] = useState<ReportRow[]>([]);
  const [stats, setStats] = useState({ pending: 0, approvedToday: 0, rejected: 0, escalated: 0 });
  const [loading, setLoading] = useState(true);
  const [statsRefreshing, setStatsRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<string | null>(null);

  const fetchReports = useCallback(async (isStatRefresh = false) => {
    if (isStatRefresh) setStatsRefreshing(true);
    else setLoading(true);
    try {
      const token = getToken();
      const [pendingRes, approvedRes, rejectedRes, escalatedRes] = await Promise.all([
        fetch('http://localhost:3000/api/reports?status=PENDING_CDA&limit=50', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:3000/api/reports?status=APPROVED_TO_DEPT&limit=1', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:3000/api/reports?status=REJECTED&limit=1', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:3000/api/reports?status=ESCALATED&limit=1', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const pending: ApiResponse = await pendingRes.json();
      const approved: ApiResponse = await approvedRes.json();
      const rejected: ApiResponse = await rejectedRes.json();
      const escalated: ApiResponse = await escalatedRes.json();
      setStats({ pending: pending.total, approvedToday: approved.total, rejected: rejected.total, escalated: escalated.total });
      setReports(pending.data.map((r) => ({
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

  async function handleApprove(reportId: string) {
    setActionLoading(reportId + ':approve');
    try {
      const res = await fetch(`http://localhost:3000/api/workflow/approve/${reportId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error((await res.json()).message ?? 'Failed');
      push('Report approved and sent to department ✓');
      await fetchReports();
    } catch (e) {
      push(e instanceof Error ? e.message : 'Approval failed', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(reportId: string, note: string) {
    const res = await fetch(`http://localhost:3000/api/workflow/reject/${reportId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ note }),
    });
    if (!res.ok) throw new Error((await res.json()).message ?? 'Failed');
    push('Report rejected ✓');
    setRejectModal(null);
    await fetchReports();
  }

  const statCards = [
    { label: 'Pending Review', value: stats.pending, color: '#6ee7b7' },
    { label: 'Approved Today', value: stats.approvedToday, color: '#60a5fa' },
    { label: 'Rejected', value: stats.rejected, color: '#f87171' },
    { label: 'Escalated', value: stats.escalated, color: '#fb923c' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-100 p-6 font-sans">
      <div className="mb-8">
        <p className="text-xs text-[#6ee7b7] font-mono uppercase tracking-widest mb-1">ResolveIQ</p>
        <h1 className="text-2xl font-bold text-white">CDA Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Customer Data Analyst · Report Review Queue</p>
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
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Pending Review</h2>
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
        headers={['Report', 'Customer', 'Department', 'Priority', 'SLA', 'Actions']}
        reports={reports}
        loading={loading}
        emptyMsg="No pending reports"
        renderRow={(r) => (
          <ReportItem
            key={r.id}
            report={r}
            columns={['summary', 'customer', 'dept', 'priority', 'sla']}
            onClick={() => router.push(`/report/${r.id}`)}
            actions={
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(r.id)}
                  disabled={actionLoading === r.id + ':approve'}
                  className="px-3 py-1.5 bg-[#6ee7b7]/10 text-[#6ee7b7] border border-[#6ee7b7]/30 text-xs font-semibold rounded-lg hover:bg-[#6ee7b7]/20 transition-colors disabled:opacity-40"
                >
                  {actionLoading === r.id + ':approve' ? '…' : 'Approve'}
                </button>
                <button
                  onClick={() => setRejectModal(r.id)}
                  className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/30 text-xs font-semibold rounded-lg hover:bg-red-500/20 transition-colors"
                >
                  Reject
                </button>
              </div>
            }
          />
        )}
      />

      {rejectModal && (
        <RejectModal
          reportId={rejectModal}
          onConfirm={(note) => handleReject(rejectModal, note)}
          onClose={() => setRejectModal(null)}
        />
      )}

      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}