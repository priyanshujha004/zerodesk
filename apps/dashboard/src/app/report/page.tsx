'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ReportQueue } from '@/components/dashboard/ReportQueue';
import { ReportItem, ReportRow } from '@/components/dashboard/ReportItem';

// In real app, get token from auth context / cookie
function getToken(): string {
  return typeof window !== 'undefined'
    ? (localStorage.getItem('access_token') ?? '')
    : '';
}

interface StatCard {
  label: string;
  value: number;
  color: string;
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

export default function CdaDashboard() {
  const router = useRouter();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [stats, setStats] = useState({ pending: 0, approvedToday: 0, rejected: 0, escalated: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const [pendingRes, approvedRes, rejectedRes, escalatedRes] = await Promise.all([
        fetch('http://localhost:3000/api/reports?status=PENDING_CDA&limit=50', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:3000/api/reports?status=APPROVED_TO_DEPT&limit=1', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:3000/api/reports?status=REJECTED&limit=1', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:3000/api/reports?status=ESCALATED&limit=1', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const pending: ApiResponse = await pendingRes.json();
      const approved: ApiResponse = await approvedRes.json();
      const rejected: ApiResponse = await rejectedRes.json();
      const escalated: ApiResponse = await escalatedRes.json();

      setStats({
        pending: pending.total,
        approvedToday: approved.total,
        rejected: rejected.total,
        escalated: escalated.total,
      });

      setReports(
        (pending.data ?? []).map((r) => ({
          id: r.id,
          issueSummary: r.issueSummary,
          customerName: r.customer?.name,
          routeToDeptName: r.routeToDeptName,
          priority: r.priority,
          slaDeadline: r.slaDeadline,
          status: r.status,
          createdAt: r.createdAt,
        })),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  async function handleApprove(reportId: string) {
    setActionLoading(reportId + ':approve');
    try {
      await fetch(`http://localhost:3000/api/workflow/approve/${reportId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({}),
      });
      await fetchReports();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(reportId: string) {
    const note = window.prompt('Rejection reason (required):');
    if (!note) return;
    setActionLoading(reportId + ':reject');
    try {
      await fetch(`http://localhost:3000/api/workflow/reject/${reportId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ note }),
      });
      await fetchReports();
    } finally {
      setActionLoading(null);
    }
  }

  const statCards: StatCard[] = [
    { label: 'Pending Review', value: stats.pending, color: '#6ee7b7' },
    { label: 'Approved Today', value: stats.approvedToday, color: '#60a5fa' },
    { label: 'Rejected', value: stats.rejected, color: '#f87171' },
    { label: 'Escalated', value: stats.escalated, color: '#fb923c' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-100 p-6 font-sans">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-[#6ee7b7] font-mono uppercase tracking-widest mb-1">
          ResolveIQ
        </p>
        <h1 className="text-2xl font-bold text-white">CDA Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Customer Data Analyst · Report Review Queue</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="bg-[#12121a] border border-slate-800/60 rounded-xl p-5"
          >
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{s.label}</p>
            <p className="text-3xl font-bold" style={{ color: s.color }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Queue */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Pending Review
        </h2>
        <button
          onClick={fetchReports}
          className="text-xs text-slate-500 hover:text-[#6ee7b7] transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      <ReportQueue
        headers={['Report', 'Customer', 'Department', 'Priority', 'SLA', 'Actions']}
        reports={reports}
        loading={loading}
        emptyMsg="No pending reports 🎉"
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
                  onClick={() => handleReject(r.id)}
                  disabled={actionLoading === r.id + ':reject'}
                  className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/30 text-xs font-semibold rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-40"
                >
                  {actionLoading === r.id + ':reject' ? '…' : 'Reject'}
                </button>
              </div>
            }
          />
        )}
      />
    </div>
  );
}