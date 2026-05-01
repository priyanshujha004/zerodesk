'use client';

import { useRouter } from 'next/navigation';

type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
type ReportStatus = string;

export interface ReportRow {
  id: string;
  issueSummary: string;
  customerName?: string;
  routeToDeptName: string;
  priority: Priority;
  slaDeadline?: string | null;
  status: ReportStatus;
  escalationCount?: number;
  escalationReason?: string;
  createdAt: string;
}

interface Props {
  report: ReportRow;
  columns: ('summary' | 'customer' | 'dept' | 'priority' | 'sla' | 'status' | 'escalation' | 'created')[];
  actions?: React.ReactNode;
  onClick?: () => void;
}

const PRIORITY_STYLES: Record<Priority, string> = {
  HIGH: 'bg-red-500/20 text-red-400 border border-red-500/30',
  MEDIUM: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  LOW: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
};

function SlaCountdown({ deadline }: { deadline?: string | null }) {
  if (!deadline) return <span className="text-slate-600">—</span>;

  const diff = new Date(deadline).getTime() - Date.now();
  const breached = diff < 0;
  const absMs = Math.abs(diff);
  const h = Math.floor(absMs / 3600000);
  const m = Math.floor((absMs % 3600000) / 60000);

  const label = breached ? `${h}h ${m}m ago` : `${h}h ${m}m`;

  return (
    <span
      className={`font-mono text-xs px-2 py-1 rounded ${
        breached
          ? 'bg-red-900/40 text-red-400 border border-red-700/50'
          : diff < 3600000
            ? 'bg-amber-900/40 text-amber-400 border border-amber-700/50'
            : 'bg-[#1a1a28] text-slate-400 border border-slate-700/30'
      }`}
    >
      {breached ? '⚠ ' : ''}{label}
    </span>
  );
}

export function ReportItem({ report, columns, actions, onClick }: Props) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) { onClick(); return; }
    router.push(`/report/${report.id}`);
  };

  const colMap: Record<string, React.ReactNode> = {
    summary: (
      <td key="summary" className="px-4 py-3 text-sm text-slate-200 max-w-[240px]">
        <span className="font-mono text-xs text-[#6ee7b7] block mb-0.5">#{report.id.slice(-6)}</span>
        <span className="line-clamp-2">{report.issueSummary}</span>
      </td>
    ),
    customer: (
      <td key="customer" className="px-4 py-3 text-sm text-slate-300">
        {report.customerName ?? '—'}
      </td>
    ),
    dept: (
      <td key="dept" className="px-4 py-3 text-sm text-slate-400">
        {report.routeToDeptName}
      </td>
    ),
    priority: (
      <td key="priority" className="px-4 py-3">
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${PRIORITY_STYLES[report.priority]}`}>
          {report.priority}
        </span>
      </td>
    ),
    sla: (
      <td key="sla" className="px-4 py-3">
        <SlaCountdown deadline={report.slaDeadline} />
      </td>
    ),
    status: (
      <td key="status" className="px-4 py-3 text-xs text-slate-400 font-mono">
        {report.status}
      </td>
    ),
    escalation: (
      <td key="escalation" className="px-4 py-3 text-sm text-slate-400 max-w-[200px]">
        <span className="text-xs bg-red-900/30 text-red-400 px-2 py-0.5 rounded mr-2">
          L{report.escalationCount ?? 1}
        </span>
        <span className="line-clamp-1 text-xs">{report.escalationReason}</span>
      </td>
    ),
    created: (
      <td key="created" className="px-4 py-3 text-xs text-slate-500 font-mono whitespace-nowrap">
        {new Date(report.createdAt).toLocaleDateString('en-IN', {
          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
        })}
      </td>
    ),
  };

  return (
    <tr
      className="border-b border-slate-800/60 hover:bg-[#1a1a28] transition-colors cursor-pointer group"
      onClick={handleClick}
    >
      {columns.map((c) => colMap[c])}
      {actions && (
        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
          {actions}
        </td>
      )}
    </tr>
  );
}