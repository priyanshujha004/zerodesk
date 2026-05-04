'use client';

import { ReportRow } from './ReportItem';

interface Props {
  headers: string[];
  reports: ReportRow[];
  renderRow: (report: ReportRow) => React.ReactNode;
  loading?: boolean;
  emptyMsg?: string;
}

export function ReportQueue({ headers, reports, renderRow, loading, emptyMsg }: Props) {
  return (
    <div className="rounded-xl border border-slate-800/60 overflow-hidden bg-[#12121a]">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-800">
              {headers.map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-widest"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-4 py-12 text-center text-slate-600 text-sm"
                >
                  <span className="inline-block animate-pulse">Loading reports…</span>
                </td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-4 py-12 text-center text-slate-600 text-sm"
                >
                  {emptyMsg ?? 'No reports found.'}
                </td>
              </tr>
            ) : (
              reports.map((r) => renderRow(r))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}