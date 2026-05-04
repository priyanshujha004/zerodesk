<<<<<<< HEAD
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

// ── Types ────────────────────────────────────────────────────────────────────

type Role = 'CUSTOMER' | 'CDA' | 'DEPT_ADMIN' | 'SUPER_ADMIN';
type ReportStatus =
  | 'DRAFT' | 'PENDING_CDA' | 'INFO_REQUESTED' | 'APPROVED_TO_DEPT'
  | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';
type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
type EscalationDecision = 'OVERRIDE_APPROVE' | 'UPHOLD_CLOSE' | 'NEEDS_MORE_INFO';

interface Actor {
  id: string;
  name?: string;
  email?: string;
=======
// TODO P4 — all roles
// apps/dashboard/src/app/report/[id]/page.tsx

import { notFound } from 'next/navigation';
import ReportDetail, { ReportData } from '@/components/report/ReportDetail';

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:3000';

async function fetchReport(id: string): Promise<ReportData | null> {
  try {
    const res = await fetch(`${BACKEND}/api/reports/${id}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json() as Promise<ReportData>;
  } catch {
    return null;
  }
}

interface PageProps {
  params: { id: string };
}

export default async function ReportPage({ params }: PageProps) {
  const report = await fetchReport(params.id);

  if (!report) {
    notFound();
  }

  return <ReportDetail report={report} />;
>>>>>>> notify-report
}

interface TimelineEntry {
  id: string;
  actorId: string;
  actorRole: Role;
  actor: Actor;
  fromStatus?: ReportStatus | null;
  toStatus: ReportStatus;
  note?: string | null;
  actionTaken?: string | null;
  isSystemEntry: boolean;
  createdAt: string;
}

interface Escalation {
  id: string;
  escalatedById: string;
  escalationReason: string;
  resolvedById?: string | null;
  resolvedAt?: string | null;
  resolutionNote?: string | null;
  decision?: EscalationDecision | null;
  level: number;
  createdAt: string;
}

interface Report {
  id: string;
  issueType: string;
  issueSummary: string;
  actionRequested: string;
  routeToDeptName: string;
  priority: Priority;
  status: ReportStatus;
  aiConfidence?: number | null;
  refundAmount?: number | null;
  resolution?: string | null;
  slaDeadline?: string | null;
  slaBreached: boolean;
  escalationCount: number;
  createdAt: string;
  updatedAt: string;
  timeline: TimelineEntry[];
  escalations: Escalation[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<ReportStatus, string> = {
  DRAFT:            'bg-slate-700/40 text-slate-400 border-slate-600/40',
  PENDING_CDA:      'bg-amber-500/20 text-amber-400 border-amber-500/30',
  INFO_REQUESTED:   'bg-blue-500/20 text-blue-400 border-blue-500/30',
  APPROVED_TO_DEPT: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  IN_PROGRESS:      'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  COMPLETED:        'bg-[#6ee7b7]/20 text-[#6ee7b7] border-[#6ee7b7]/30',
  REJECTED:         'bg-red-500/20 text-red-400 border-red-500/30',
  ESCALATED:        'bg-orange-500/20 text-orange-400 border-orange-500/30',
  RESOLVED:         'bg-purple-500/20 text-purple-400 border-purple-500/30',
  CLOSED:           'bg-slate-600/20 text-slate-500 border-slate-600/30',
};

const PRIORITY_COLORS: Record<Priority, string> = {
  HIGH:   'text-red-400',
  MEDIUM: 'text-amber-400',
  LOW:    'text-slate-400',
};

const ROLE_LABEL: Record<Role, string> = {
  CUSTOMER:    'Customer',
  CDA:         'CDA',
  DEPT_ADMIN:  'Dept Admin',
  SUPER_ADMIN: 'Super Admin',
};

const TIMELINE_DOT: Record<Role, string> = {
  CUSTOMER:    'bg-blue-400',
  CDA:         'bg-[#6ee7b7]',
  DEPT_ADMIN:  'bg-purple-400',
  SUPER_ADMIN: 'bg-orange-400',
};

function SlaTag({ deadline, breached }: { deadline?: string | null; breached: boolean }) {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  const isOver = diff < 0 || breached;
  const absMs = Math.abs(diff);
  const h = Math.floor(absMs / 3600000);
  const m = Math.floor((absMs % 3600000) / 60000);
  return (
    <span className={`text-xs font-mono px-2 py-1 rounded border ${
      isOver
        ? 'bg-red-900/30 text-red-400 border-red-700/40'
        : diff < 3600000
          ? 'bg-amber-900/30 text-amber-400 border-amber-700/40'
          : 'bg-slate-800 text-slate-400 border-slate-700/40'
    }`}>
      {isOver ? `⚠ SLA breached ${h}h ${m}m ago` : `SLA: ${h}h ${m}m left`}
    </span>
  );
}

// ── Action Panel ─────────────────────────────────────────────────────────────

type ActionType =
  | 'approve' | 'reject' | 'info-request'
  | 'acknowledge' | 'dept-action'
  | 'escalate' | 'respond'
  | 'resolve';

interface ActionModalProps {
  type: ActionType;
  reportId: string;
  onSuccess: () => void;
  onClose: () => void;
}

function ActionModal({ type, reportId, onSuccess, onClose }: ActionModalProps) {
  const [note, setNote] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [decision, setDecision] = useState<EscalationDecision>('OVERRIDE_APPROVE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const LABELS: Record<ActionType, { title: string; cta: string; noteLabel: string; noteRequired: boolean }> = {
    'approve':      { title: 'Approve Report',        cta: 'Approve',       noteLabel: 'Note (optional)',         noteRequired: false },
    'reject':       { title: 'Reject Report',         cta: 'Reject',        noteLabel: 'Rejection reason',        noteRequired: true  },
    'info-request': { title: 'Request More Info',     cta: 'Send Request',  noteLabel: 'What info do you need?',  noteRequired: true  },
    'acknowledge':  { title: 'Acknowledge Report',    cta: 'Acknowledge',   noteLabel: 'Note (optional)',         noteRequired: false },
    'dept-action':  { title: 'Resolve Report',        cta: 'Submit',        noteLabel: 'Resolution note',         noteRequired: true  },
    'escalate':     { title: 'Escalate Report',       cta: 'Escalate',      noteLabel: 'Reason for escalation',   noteRequired: true  },
    'respond':      { title: 'Provide More Info',     cta: 'Submit Info',   noteLabel: 'Your response',           noteRequired: true  },
    'resolve':      { title: 'Resolve Escalation',   cta: 'Submit',        noteLabel: 'Resolution note',         noteRequired: true  },
  };

  const cfg = LABELS[type];

  async function submit() {
    if (cfg.noteRequired && !note.trim()) { setError('This field is required.'); return; }
    if (type === 'dept-action' && !actionTaken.trim()) { setError('Action Taken is required.'); return; }

    setLoading(true);
    setError(null);

    const endpointMap: Record<ActionType, string> = {
      'approve':      `/api/workflow/approve/${reportId}`,
      'reject':       `/api/workflow/reject/${reportId}`,
      'info-request': `/api/workflow/info-request/${reportId}`,
      'acknowledge':  `/api/workflow/acknowledge/${reportId}`,
      'dept-action':  `/api/workflow/action/${reportId}`,
      'escalate':     `/api/workflow/escalate/${reportId}`,
      'respond':      `/api/workflow/respond/${reportId}`,
      'resolve':      `/api/workflow/resolve/${reportId}`,
    };

    const bodyMap: Record<ActionType, object> = {
      'approve':      { note: note || undefined },
      'reject':       { note },
      'info-request': { note },
      'acknowledge':  {},
      'dept-action':  { note, actionTaken },
      'escalate':     { reason: note },
      'respond':      { note },
      'resolve':      { decision, note },
    };

    try {
      const res = await fetch(endpointMap[type], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(bodyMap[type]),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(err.message ?? 'Request failed');
      }
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[#12121a] border border-slate-700/60 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[#6ee7b7] font-semibold text-lg mb-5">{cfg.title}</h2>

        {/* Decision selector for resolve */}
        {type === 'resolve' && (
          <div className="mb-4">
            <label className="block text-xs text-slate-500 mb-2 uppercase tracking-wider">Decision</label>
            <div className="flex flex-col gap-2">
              {(['OVERRIDE_APPROVE', 'UPHOLD_CLOSE', 'NEEDS_MORE_INFO'] as EscalationDecision[]).map((d) => (
                <label key={d} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="decision"
                    value={d}
                    checked={decision === d}
                    onChange={() => setDecision(d)}
                    className="accent-[#6ee7b7]"
                  />
                  <span className={`text-sm ${decision === d ? 'text-[#6ee7b7]' : 'text-slate-400'}`}>
                    {d === 'OVERRIDE_APPROVE' ? '✓ Override & Approve → RESOLVED'
                      : d === 'UPHOLD_CLOSE' ? '✕ Uphold Rejection → CLOSED'
                      : '? Needs More Info → INFO_REQUESTED'}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        <label className="block text-xs text-slate-500 mb-1 uppercase tracking-wider">{cfg.noteLabel}</label>
        <textarea
          className="w-full bg-[#0a0a0f] border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#6ee7b7]/50 mb-3 resize-none"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={cfg.noteRequired ? 'Required…' : 'Optional…'}
        />

        {type === 'dept-action' && (
          <>
            <label className="block text-xs text-slate-500 mb-1 uppercase tracking-wider">Action Taken</label>
            <input
              className="w-full bg-[#0a0a0f] border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#6ee7b7]/50 mb-4"
              placeholder="e.g. Refund processed, Account updated…"
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
            />
          </>
        )}

        {error && (
          <p className="text-red-400 text-xs mb-3 bg-red-900/20 border border-red-800/40 rounded px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ${
              type === 'reject' || type === 'escalate'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                : 'bg-[#6ee7b7] text-[#0a0a0f] hover:bg-[#4dd9a4]'
            }`}
          >
            {loading ? 'Submitting…' : cfg.cta}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [userRole, setUserRole] = useState<Role>('CUSTOMER');
  const [userId, setUserId] = useState('');

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(u => {
        setUserRole(u.role);
        setUserId(u.id);
      })
      .catch(() => {});
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        credentials: 'include',
      });
  
      if (res.status === 404) {
        setError('Report not found');
        return;
      }
  
      if (!res.ok) {
        setError(`Failed to load report (${res.status})`);
        return;
      }
  
      setReport(await res.json() as Report);
    } catch (err) {
      setError('Network error — is the backend running?');
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // ── Role-aware available actions ────────────────────────────
  function availableActions(r: Report): ActionType[] {
    const s = r.status;
    switch (userRole) {
      case 'CDA':
        if (s === 'PENDING_CDA') return ['approve', 'reject', 'info-request'];
        return [];
      case 'DEPT_ADMIN':
        if (s === 'APPROVED_TO_DEPT') return ['acknowledge', 'dept-action'];
        if (s === 'IN_PROGRESS') return ['dept-action', 'reject'];
        return [];
      case 'CUSTOMER':
        if (s === 'REJECTED') return ['escalate'];
        if (s === 'INFO_REQUESTED' && r.timeline.some((t) => t.actorId === userId)) return ['respond'];
        return [];
      case 'SUPER_ADMIN':
        if (s === 'ESCALATED') return ['resolve'];
        return [];
      default:
        return [];
    }
  }

  const ACTION_LABELS: Record<ActionType, string> = {
    'approve':      'Approve',
    'reject':       'Reject',
    'info-request': 'Request Info',
    'acknowledge':  'Acknowledge',
    'dept-action':  'Take Action',
    'escalate':     'Escalate',
    'respond':      'Respond',
    'resolve':      'Resolve Escalation',
  };

  const ACTION_STYLES: Record<ActionType, string> = {
    'approve':      'bg-[#6ee7b7]/10 text-[#6ee7b7] border border-[#6ee7b7]/30 hover:bg-[#6ee7b7]/20',
    'reject':       'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20',
    'info-request': 'bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20',
    'acknowledge':  'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20',
    'dept-action':  'bg-[#6ee7b7]/10 text-[#6ee7b7] border border-[#6ee7b7]/30 hover:bg-[#6ee7b7]/20',
    'escalate':     'bg-orange-500/10 text-orange-400 border border-orange-500/30 hover:bg-orange-500/20',
    'respond':      'bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20',
    'resolve':      'bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <span className="text-slate-600 animate-pulse text-sm">Loading report…</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <span className="text-red-400 text-sm">{error}</span>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <span className="text-red-400 text-sm">Report not found.</span>
      </div>
    );
  }

  const actions = availableActions(report);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-100 p-6 font-sans max-w-4xl mx-auto">

      {/* Back */}
      <button
        onClick={() => router.back()}
        className="text-xs text-slate-500 hover:text-[#6ee7b7] transition-colors mb-6 flex items-center gap-1"
      >
        ← Back
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-mono text-slate-500 mb-1">#{report.id.slice(-8).toUpperCase()}</p>
          <h1 className="text-xl font-bold text-white leading-snug">{report.issueSummary}</h1>
          <div className="flex flex-wrap gap-2 mt-3 items-center">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLORS[report.status]}`}>
              {report.status.replace(/_/g, ' ')}
            </span>
            <span className={`text-xs font-semibold ${PRIORITY_COLORS[report.priority]}`}>
              ● {report.priority}
            </span>
            <span className="text-xs text-slate-500">{report.issueType}</span>
            <span className="text-xs text-slate-500">→ {report.routeToDeptName}</span>
            <SlaTag deadline={report.slaDeadline} breached={report.slaBreached} />
          </div>
        </div>

        {/* Action buttons */}
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {actions.map((a) => (
              <button
                key={a}
                onClick={() => setActiveAction(a)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${ACTION_STYLES[a]}`}
              >
                {ACTION_LABELS[a]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Action Requested', value: report.actionRequested },
          { label: 'AI Confidence', value: report.aiConfidence != null ? `${Math.round(report.aiConfidence * 100)}%` : '—' },
          { label: 'Refund Amount', value: report.refundAmount != null ? `₹${report.refundAmount.toLocaleString('en-IN')}` : '—' },
          { label: 'Submitted', value: new Date(report.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#12121a] border border-slate-800/60 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className="text-sm text-slate-200 font-medium">{value}</p>
          </div>
        ))}
      </div>

      {/* Resolution (if complete) */}
      {report.resolution && (
        <div className="bg-[#6ee7b7]/5 border border-[#6ee7b7]/20 rounded-xl p-4 mb-8">
          <p className="text-xs text-[#6ee7b7] uppercase tracking-wider mb-1">Resolution</p>
          <p className="text-sm text-slate-300">{report.resolution}</p>
        </div>
      )}

      {/* Escalations */}
      {report.escalations.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
            Escalations ({report.escalations.length})
          </h2>
          <div className="flex flex-col gap-3">
            {report.escalations.map((esc) => (
              <div key={esc.id} className="bg-orange-900/10 border border-orange-700/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-orange-400 font-semibold">Level {esc.level}</span>
                  <span className="text-xs text-slate-500 font-mono">
                    {new Date(esc.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
                <p className="text-sm text-slate-300 mb-2">{esc.escalationReason}</p>
                {esc.decision && (
                  <div className="mt-2 pt-2 border-t border-orange-700/20">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      esc.decision === 'OVERRIDE_APPROVE' ? 'bg-[#6ee7b7]/20 text-[#6ee7b7]'
                      : esc.decision === 'UPHOLD_CLOSE' ? 'bg-red-500/20 text-red-400'
                      : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {esc.decision.replace(/_/g, ' ')}
                    </span>
                    {esc.resolutionNote && (
                      <p className="text-xs text-slate-400 mt-1">{esc.resolutionNote}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
          Timeline ({report.timeline.length})
        </h2>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-800" />

          <div className="flex flex-col gap-6">
            {report.timeline.map((entry) => (
              <div key={entry.id} className="flex gap-4 relative">
                {/* Dot */}
                <div className={`w-3.5 h-3.5 rounded-full mt-0.5 shrink-0 z-10 ${TIMELINE_DOT[entry.actorRole]} ${entry.isSystemEntry ? 'opacity-40' : ''}`} />

                <div className="flex-1 pb-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-slate-300">
                      {entry.actor?.name ?? entry.actorId}
                    </span>
                    <span className="text-xs text-slate-600">{ROLE_LABEL[entry.actorRole]}</span>
                    {entry.fromStatus && (
                      <span className="text-xs text-slate-600">
                        <span className="font-mono">{entry.fromStatus.replace(/_/g, ' ')}</span>
                        {' → '}
                        <span className="font-mono text-slate-400">{entry.toStatus.replace(/_/g, ' ')}</span>
                      </span>
                    )}
                    {!entry.fromStatus && (
                      <span className="text-xs font-mono text-slate-500">{entry.toStatus.replace(/_/g, ' ')}</span>
                    )}
                    {entry.isSystemEntry && (
                      <span className="text-xs text-slate-700 italic">system</span>
                    )}
                    <span className="text-xs text-slate-600 ml-auto font-mono">
                      {new Date(entry.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                  {entry.note && (
                    <p className="text-sm text-slate-400 bg-[#12121a] border border-slate-800/60 rounded-lg px-3 py-2 mt-1">
                      {entry.note}
                    </p>
                  )}
                  {entry.actionTaken && (
                    <p className="text-xs text-[#6ee7b7] mt-1">
                      Action: {entry.actionTaken}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Modal */}
      {activeAction && (
        <ActionModal
          type={activeAction}
          reportId={report.id}
          onSuccess={() => { setActiveAction(null); fetchReport(); }}
          onClose={() => setActiveAction(null)}
        />
      )}
    </div>
  );
}