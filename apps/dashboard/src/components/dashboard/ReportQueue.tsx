// ─────────────────────────────────────────────────────────────
// ReportQueue.tsx
// ─────────────────────────────────────────────────────────────
'use client';

import { ReportRow } from './ReportItem';

interface QueueProps {
  headers: string[];
  reports: ReportRow[];
  renderRow: (r: ReportRow) => React.ReactNode;
  loading?: boolean;
  emptyMsg?: string;
}

export function ReportQueue({ headers, reports, renderRow, loading, emptyMsg }: QueueProps) {
  return (
    <div style={{
      border: '1px solid #1a1a1a', borderRadius: '8px',
      overflow: 'hidden', background: '#080808',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1a1a1a', background: '#000000' }}>
              {headers.map(h => (
                <th key={h} style={{
                  padding: '10px 16px', textAlign: 'left',
                  fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: '#333333',
                  fontFamily: 'Space Grotesk, sans-serif',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={headers.length} style={{ padding: '48px 16px', textAlign: 'center', color: '#333333', fontSize: '13px' }}>
                  <span style={{ animation: 'pulse 1.5s ease infinite', display: 'inline-block' }}>Loading…</span>
                </td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={headers.length} style={{ padding: '48px 16px', textAlign: 'center', color: '#333333', fontSize: '13px' }}>
                  {emptyMsg ?? 'No reports found.'}
                </td>
              </tr>
            ) : (
              reports.map(r => renderRow(r))
            )}
          </tbody>
        </table>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}`}</style>
    </div>
  );
}