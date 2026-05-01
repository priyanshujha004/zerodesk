'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ReportQueue } from '@/components/dashboard/ReportQueue';
import { ReportItem, ReportRow } from '@/components/dashboard/ReportItem';

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
  escalationCount?: number;
  escalations?: { escalationReason?: string }[];
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  data: ApiReport[];
  total: number;
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [stats, setStats] = useState({
    totalEscalated: 0,
    resolvedToday: 0,
    closedToday: 0,
    avgResolutionHours: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const [escRes, resolvedRes, closedRes] = await Promise.all([
        fetch('http://localhost:3000/api/reports?status=ESCALATED&limit=50', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:3000/api/reports?status=RESOLVED&limit=50', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:3000/api/reports?status=CLOSED&limit=50', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const escalated: ApiResponse = await escRes.json();
      const resolved: ApiResponse = await resolvedRes.json();
      const closed: ApiResponse = await closedRes.json();

      const today = new Date().toDateString();

      const resolvedToday = resolved.data.filter(
        (r) => new Date(r.updatedAt).toDateString() === today,
      ).length;

      const closedToday = closed.data.filter(
        (r) => new Date(r.updatedAt).toDateString() === today,
      ).length;

      // Avg resolution time across resolved + closed
      const allResolved = [...resolved.data, ...closed.data];
      const avgMs =
        allResolved.length > 0
          ? allResolved.reduce((acc, r) => {
              return acc + (new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime());
            }, 0) / allResolved.length
          : 0;

      setStats({
        totalEscalated: escalated.total,
        resolvedToday,
        closedToday,
        avgResolutionHours: Math.round(avgMs / 3600000),
      });

      setReports(
        escalated.data.map((r) => ({
          id: r.id,
          issueSummary: r.issueSummary,
          customerName: r.customer?.name,
          routeToDeptName: r.routeToDeptName,
          priority: r.priority,
          slaDeadline: r.slaDeadline,
          status: r.status,
          escalationCount: r.escalationCount,
          escalationReason: r.escalations?.[0]?.escalationReason,
          createdAt: r.createdAt,
        })),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const statCards = [
    { label: 'Total Escalated', value: stats.totalEscalated, color: '#fb923c', suffix: '' },
    { label: 'Resolved Today', value: stats.resolvedToday, color: '#6ee7b7', suffix: '' },
    { label: 'Closed Today', value: stats.closedToday, color: '#60a5fa', suffix: '' },
    { label: 'Avg Resolution', value: stats.avgResolutionHours, color: '#a78bfa', suffix: 'h' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-100 p-6 font-sans">
      <div className="mb-8">
        <p className="text-xs text-[#6ee7b7] font-mono uppercase tracking-widest mb-1">ResolveIQ</p>
        <h1 className="text-2xl font-bold text-white">Super Admin Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Escalation Resolution Center</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <div key={s.label} className="bg-[#12121a] border border-slate-800/60 rounded-xl p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{s.label}</p>
            <p className="text-3xl font-bold" style={{ color: s.color }}>
              {s.value}{s.suffix}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Escalated Reports
        </h2>
        <button onClick={fetchReports} className="text-xs text-slate-500 hover:text-[#6ee7b7] transition-colors">
          ↻ Refresh
        </button>
      </div>

      <ReportQueue
        headers={['Report', 'Escalation', 'Customer', 'Level', 'Created']}
        reports={reports}
        loading={loading}
        emptyMsg="No escalations pending ✓"
        renderRow={(r) => (
          <ReportItem
            key={r.id}
            report={r}
            columns={['summary', 'escalation', 'customer', 'created']}
            onClick={() => router.push(`/report/${r.id}`)}
          />
        )}
      />
    </div>
  );
}