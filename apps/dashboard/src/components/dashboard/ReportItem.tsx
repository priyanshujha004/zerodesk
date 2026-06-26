'use client';

import { useRouter } from 'next/navigation';

type Priority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ReportRow {
  id: string;
  issueSummary: string;
  customerName?: string;
  routeToDeptName: string;
  priority: Priority;
  slaDeadline?: string | null;
  status: string;
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

const PRI: Record<Priority, { bg: string; color: string }> = {
  HIGH:   { bg: 'rgba(248,113,113,0.08)', color: '#f87171' },
  MEDIUM: { bg: 'rgba(251,191,36,0.08)',  color: '#fbbf24' },
  LOW:    { bg: 'rgba(115,115,115,0.08)', color: '#737373' },
};

function SlaCell({ deadline }: { deadline?: string | null }) {
  if (!deadline) return <span style={{ color: '#333333', fontSize: '12px' }}>—</span>;
  const diff = new Date(deadline).getTime() - Date.now();
  const breached = diff < 0;
  const absMs = Math.abs(diff);
  const h = Math.floor(absMs / 3600000);
  const m = Math.floor((absMs % 3600000) / 60000);
  return (
    <span style={{
      fontFamily: 'Space Grotesk, sans-serif', fontSize: '12px',
      padding: '3px 8px', borderRadius: '4px', border: '1px solid',
      background: breached ? 'rgba(248,113,113,0.08)' : diff < 3600000 ? 'rgba(251,191,36,0.08)' : '#0a0a0a',
      color: breached ? '#f87171' : diff < 3600000 ? '#fbbf24' : '#404040',
      borderColor: breached ? 'rgba(248,113,113,0.2)' : diff < 3600000 ? 'rgba(251,191,36,0.2)' : '#1a1a1a',
    }}>
      {breached ? `⚠ ${h}h ${m}m ago` : `${h}h ${m}m`}
    </span>
  );
}

const TD: React.CSSProperties = { padding: '12px 16px', verticalAlign: 'middle' };

export function ReportItem({ report, columns, actions, onClick }: Props) {
  const router = useRouter();

  const colMap: Record<string, React.ReactNode> = {
    summary: (
      <td key="summary" style={{ ...TD, maxWidth: '260px' }}>
        <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '11px', color: '#404040', display: 'block', marginBottom: '3px' }}>
          #{report.id.slice(-6).toUpperCase()}
        </span>
        <span style={{ fontSize: '13px', color: '#a3a3a3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
          {report.issueSummary}
        </span>
      </td>
    ),
    customer: (
      <td key="customer" style={TD}>
        <span style={{ fontSize: '13px', color: '#737373' }}>{report.customerName ?? '—'}</span>
      </td>
    ),
    dept: (
      <td key="dept" style={TD}>
        <span style={{ fontSize: '12px', color: '#404040' }}>{report.routeToDeptName}</span>
      </td>
    ),
    priority: (
      <td key="priority" style={TD}>
        <span style={{
          fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '4px',
          fontFamily: 'Space Grotesk, sans-serif',
          background: PRI[report.priority].bg, color: PRI[report.priority].color,
        }}>
          {report.priority}
        </span>
      </td>
    ),
    sla: (
      <td key="sla" style={TD}><SlaCell deadline={report.slaDeadline} /></td>
    ),
    status: (
      <td key="status" style={TD}>
        <span style={{ fontSize: '11px', color: '#404040', fontFamily: 'Space Grotesk, sans-serif' }}>
          {report.status.replace(/_/g, ' ')}
        </span>
      </td>
    ),
    escalation: (
      <td key="escalation" style={{ ...TD, maxWidth: '200px' }}>
        <span style={{ fontSize: '11px', background: 'rgba(248,113,113,0.08)', color: '#f87171', padding: '2px 7px', borderRadius: '4px', marginRight: '8px', fontFamily: 'Space Grotesk, sans-serif' }}>
          L{report.escalationCount ?? 1}
        </span>
        <span style={{ fontSize: '12px', color: '#737373', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {report.escalationReason ?? '—'}
        </span>
      </td>
    ),
    created: (
      <td key="created" style={TD}>
        <span style={{ fontSize: '11px', color: '#333333', fontFamily: 'Space Grotesk, sans-serif' }}>
          {new Date(report.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      </td>
    ),
  };

  return (
    <tr
      onClick={() => onClick ? onClick() : router.push(`/report/${report.id}`)}
      style={{ borderBottom: '1px solid #0f0f0f', cursor: 'pointer', transition: 'background 0.1s' }}
      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#0a0a0a'}
      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
    >
      {columns.map(c => colMap[c])}
      {actions && (
        <td style={TD} onClick={e => e.stopPropagation()}>{actions}</td>
      )}
    </tr>
  );
}