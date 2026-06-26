'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

type Role = 'CUSTOMER' | 'CDA' | 'DEPT_ADMIN' | 'SUPER_ADMIN';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
type ReportStatus = 'DRAFT' | 'PENDING_CDA' | 'INFO_REQUESTED' | 'APPROVED_TO_DEPT' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'ESCALATED' | 'RESOLVED' | 'CLOSED' | 'AUTO_RESOLVED';
type EscalationDecision = 'OVERRIDE_APPROVE' | 'UPHOLD_CLOSE' | 'NEEDS_MORE_INFO';
type ActionType = 'approve' | 'reject' | 'info-request' | 'acknowledge' | 'dept-action' | 'escalate' | 'respond' | 'resolve';

interface Actor { id: string; name?: string; email?: string; }
interface TimelineEntry { id: string; actorId: string; actorRole: Role; actor: Actor; fromStatus?: ReportStatus | null; toStatus: ReportStatus; note?: string | null; actionTaken?: string | null; isSystemEntry: boolean; createdAt: string; }
interface Escalation { id: string; escalatedById: string; escalationReason: string; resolvedById?: string | null; resolvedAt?: string | null; resolutionNote?: string | null; decision?: EscalationDecision | null; level: number; createdAt: string; }
interface Report { id: string; issueType: string; issueSummary: string; actionRequested: string; routeToDeptName: string; priority: Priority; status: ReportStatus; aiConfidence?: number | null; refundAmount?: number | null; resolution?: string | null; slaDeadline?: string | null; slaBreached: boolean; escalationCount: number; createdAt: string; updatedAt: string; timeline: TimelineEntry[]; escalations: Escalation[]; }

// ── Status/priority colors ────────────────────────────────────────────────────

const STATUS_BG: Partial<Record<ReportStatus, { bg: string; color: string; border: string }>> = {
  DRAFT:            { bg: 'rgba(115,115,115,0.08)', color: '#737373', border: 'rgba(115,115,115,0.2)' },
  PENDING_CDA:      { bg: 'rgba(251,191,36,0.08)',  color: '#fbbf24', border: 'rgba(251,191,36,0.2)' },
  INFO_REQUESTED:   { bg: 'rgba(56,189,248,0.08)',  color: '#38bdf8', border: 'rgba(56,189,248,0.2)' },
  APPROVED_TO_DEPT: { bg: 'rgba(52,211,153,0.08)',  color: '#34d399', border: 'rgba(52,211,153,0.2)' },
  IN_PROGRESS:      { bg: 'rgba(56,189,248,0.08)',  color: '#38bdf8', border: 'rgba(56,189,248,0.2)' },
  COMPLETED:        { bg: 'rgba(52,211,153,0.08)',  color: '#34d399', border: 'rgba(52,211,153,0.2)' },
  REJECTED:         { bg: 'rgba(248,113,113,0.08)', color: '#f87171', border: 'rgba(248,113,113,0.2)' },
  ESCALATED:        { bg: 'rgba(251,146,60,0.08)',  color: '#fb923c', border: 'rgba(251,146,60,0.2)' },
  RESOLVED:         { bg: 'rgba(167,139,250,0.08)', color: '#a78bfa', border: 'rgba(167,139,250,0.2)' },
  CLOSED:           { bg: 'rgba(115,115,115,0.08)', color: '#404040', border: 'rgba(115,115,115,0.2)' },
  AUTO_RESOLVED:    { bg: 'rgba(52,211,153,0.08)',  color: '#34d399', border: 'rgba(52,211,153,0.2)' },
};

const TIMELINE_DOT: Record<Role, string> = {
  CUSTOMER:    '#818cf8',
  CDA:         '#34d399',
  DEPT_ADMIN:  '#38bdf8',
  SUPER_ADMIN: '#fb923c',
};

const ROLE_LABEL: Record<Role, string> = {
  CUSTOMER: 'Customer', CDA: 'CDA', DEPT_ADMIN: 'Dept Admin', SUPER_ADMIN: 'Super Admin',
};

// ── Action modal ──────────────────────────────────────────────────────────────

function ActionModal({ type, reportId, onSuccess, onClose }: { type: ActionType; reportId: string; onSuccess: () => void; onClose: () => void }) {
  const [note, setNote]           = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [decision, setDecision]   = useState<EscalationDecision>('OVERRIDE_APPROVE');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const CFG: Record<ActionType, { title: string; cta: string; noteLabel: string; req: boolean }> = {
    approve:      { title: 'Approve Report',      cta: 'Approve',      noteLabel: 'Note (optional)',        req: false },
    reject:       { title: 'Reject Report',       cta: 'Reject',       noteLabel: 'Rejection reason',       req: true  },
    'info-request': { title: 'Request More Info', cta: 'Send Request', noteLabel: 'What info do you need?', req: true  },
    acknowledge:  { title: 'Acknowledge',         cta: 'Acknowledge',  noteLabel: 'Note (optional)',        req: false },
    'dept-action': { title: 'Resolve Report',     cta: 'Submit',       noteLabel: 'Resolution note',        req: true  },
    escalate:     { title: 'Escalate Report',     cta: 'Escalate',     noteLabel: 'Reason for escalation',  req: true  },
    respond:      { title: 'Provide More Info',   cta: 'Submit Info',  noteLabel: 'Your response',          req: true  },
    resolve:      { title: 'Resolve Escalation',  cta: 'Submit',       noteLabel: 'Resolution note',        req: true  },
  };

  const cfg = CFG[type];

  const ENDPOINTS: Record<ActionType, string> = {
    approve: `/api/workflow/approve/${reportId}`,
    reject: `/api/workflow/reject/${reportId}`,
    'info-request': `/api/workflow/info-request/${reportId}`,
    acknowledge: `/api/workflow/acknowledge/${reportId}`,
    'dept-action': `/api/workflow/action/${reportId}`,
    escalate: `/api/workflow/escalate/${reportId}`,
    respond: `/api/workflow/respond/${reportId}`,
    resolve: `/api/workflow/resolve/${reportId}`,
  };

  const BODIES: Record<ActionType, object> = {
    approve: { note: note || undefined },
    reject: { note },
    'info-request': { note },
    acknowledge: {},
    'dept-action': { note, actionTaken },
    escalate: { reason: note },
    respond: { note },
    resolve: { decision, note },
  };

  async function submit() {
    if (cfg.req && !note.trim()) { setError('This field is required.'); return; }
    if (type === 'dept-action' && !actionTaken.trim()) { setError('Action Taken is required.'); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(ENDPOINTS[type], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(BODIES[type]),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(err.message ?? 'Request failed');
      }
      onSuccess();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unknown error'); }
    finally { setLoading(false); }
  }

  const inp: React.CSSProperties = { width: '100%', background: '#0a0a0a', border: '1px solid #262626', borderRadius: '6px', padding: '10px 12px', fontSize: '13px', color: '#ffffff', outline: 'none', resize: 'none' as const, fontFamily: 'Inter, sans-serif', transition: 'border-color 0.12s' };
  const lbl: React.CSSProperties = { fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#404040', display: 'block', marginBottom: '6px' };
  const isDanger = type === 'reject' || type === 'escalate';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }} onClick={onClose}>
      <div style={{ background: '#111111', border: '1px solid #262626', borderRadius: '10px', padding: '24px', width: '100%', maxWidth: '420px', boxShadow: '0 24px 48px rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()}>
        <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', fontWeight: 600, color: '#ffffff', marginBottom: '20px' }}>{cfg.title}</p>

        {type === 'resolve' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={lbl}>Decision</label>
            {(['OVERRIDE_APPROVE', 'UPHOLD_CLOSE', 'NEEDS_MORE_INFO'] as EscalationDecision[]).map(d => (
              <label key={d} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', cursor: 'pointer' }}>
                <input type="radio" name="decision" value={d} checked={decision === d} onChange={() => setDecision(d)} style={{ accentColor: '#34d399' }} />
                <span style={{ fontSize: '13px', color: decision === d ? '#34d399' : '#737373' }}>
                  {d === 'OVERRIDE_APPROVE' ? '✓ Override & Approve → RESOLVED' : d === 'UPHOLD_CLOSE' ? '✕ Uphold Rejection → CLOSED' : '? Needs More Info → INFO_REQUESTED'}
                </span>
              </label>
            ))}
          </div>
        )}

        <label style={lbl}>{cfg.noteLabel}</label>
        <textarea style={{ ...inp, marginBottom: '14px' }} rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder={cfg.req ? 'Required…' : 'Optional…'}
          onFocus={e => (e.target.style.borderColor = '#404040')} onBlur={e => (e.target.style.borderColor = '#262626')} />

        {type === 'dept-action' && (
          <>
            <label style={lbl}>Action Taken</label>
            <input style={{ ...inp, marginBottom: '16px' }} type="text" placeholder="e.g. Refund processed, Account updated…" value={actionTaken} onChange={e => setActionTaken(e.target.value)}
              onFocus={e => (e.target.style.borderColor = '#404040')} onBlur={e => (e.target.style.borderColor = '#262626')} />
          </>
        )}

        {error && <div style={{ padding: '8px 12px', marginBottom: '16px', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '5px', fontSize: '12px', color: '#f87171' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #262626', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#737373', fontFamily: 'Inter, sans-serif' }}>Cancel</button>
          <button onClick={submit} disabled={loading} style={{
            padding: '8px 20px', border: '1px solid',
            background: isDanger ? 'rgba(248,113,113,0.08)' : '#ffffff',
            color: isDanger ? '#f87171' : '#000000',
            borderColor: isDanger ? 'rgba(248,113,113,0.25)' : 'transparent',
            borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 500,
            opacity: loading ? 0.6 : 1, transition: 'all 0.12s',
          }}>
            {loading ? 'Submitting…' : cfg.cta}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ReportDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [report, setReport]       = useState<Report | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const [userRole, setUserRole]   = useState<Role>('CUSTOMER');
  const [userId, setUserId]       = useState('');

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then((u: { role?: Role; id?: string } | null) => {
        if (!u) return;
        setUserRole(u.role ?? 'CUSTOMER');
        setUserId(u.id ?? '');
      })
      .catch(() => {});
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/${id}`, { credentials: 'include' });
      if (res.status === 404) { setError('Report not found'); return; }
      if (!res.ok) { setError(`Failed to load (${res.status})`); return; }
      setReport(await res.json() as Report);
    } catch { setError('Network error — is the backend running?'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  function availableActions(r: Report): ActionType[] {
    switch (userRole) {
      case 'CDA':
        return r.status === 'PENDING_CDA' ? ['approve', 'reject', 'info-request'] : [];
      case 'DEPT_ADMIN':
        if (r.status === 'APPROVED_TO_DEPT') return ['acknowledge', 'dept-action'];
        if (r.status === 'IN_PROGRESS') return ['dept-action', 'reject'];
        return [];
      case 'CUSTOMER':
        if (r.status === 'REJECTED') return ['escalate'];
        if (r.status === 'INFO_REQUESTED' && r.timeline.some(t => t.actorId === userId)) return ['respond'];
        return [];
      case 'SUPER_ADMIN':
        return r.status === 'ESCALATED' ? ['resolve'] : [];
      default: return [];
    }
  }

  const ACTION_LABELS: Record<ActionType, string> = {
    approve: 'Approve', reject: 'Reject', 'info-request': 'Request Info',
    acknowledge: 'Acknowledge', 'dept-action': 'Take Action',
    escalate: 'Escalate', respond: 'Respond', resolve: 'Resolve Escalation',
  };

  const ACTION_STYLE: Record<ActionType, React.CSSProperties> = {
    approve:        { background: 'transparent', border: '1px solid #262626', color: '#ffffff' },
    reject:         { background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' },
    'info-request': { background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)', color: '#38bdf8' },
    acknowledge:    { background: 'transparent', border: '1px solid #262626', color: '#ffffff' },
    'dept-action':  { background: 'transparent', border: '1px solid #262626', color: '#ffffff' },
    escalate:       { background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.25)', color: '#fb923c' },
    respond:        { background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)', color: '#38bdf8' },
    resolve:        { background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)', color: '#a78bfa' },
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
      <span style={{ color: '#333333', fontSize: '13px', animation: 'pulse 1.5s ease infinite' }}>Loading report…</span>
    </div>
  );
  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
      <span style={{ color: '#f87171', fontSize: '13px' }}>{error}</span>
    </div>
  );
  if (!report) return null;

  const st = STATUS_BG[report.status] ?? { bg: 'rgba(115,115,115,0.08)', color: '#737373', border: 'rgba(115,115,115,0.2)' };
  const actions = availableActions(report);

  // SLA
  const slaMs = report.slaDeadline ? new Date(report.slaDeadline).getTime() - Date.now() : null;
  const slaBreached = slaMs !== null && (slaMs < 0 || report.slaBreached);
  const slaH = slaMs !== null ? Math.floor(Math.abs(slaMs) / 3600000) : 0;
  const slaM = slaMs !== null ? Math.floor((Math.abs(slaMs) % 3600000) / 60000) : 0;

  return (
    <div style={{ maxWidth: '800px', fontFamily: 'Inter, sans-serif' }}>
      {/* Back */}
      <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#404040', marginBottom: '24px', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '6px', transition: 'color 0.12s', padding: 0 }}
        onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
        onMouseLeave={e => (e.currentTarget.style.color = '#404040')}
      >
        ← Back
      </button>

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
        <div>
          <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '11px', color: '#333333', marginBottom: '6px' }}>
            #{report.id.slice(-8).toUpperCase()}
          </p>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '20px', fontWeight: 600, color: '#ffffff', marginBottom: '12px', lineHeight: 1.3, letterSpacing: '-0.01em' }}>
            {report.issueSummary}
          </h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '4px', fontFamily: 'Space Grotesk, sans-serif', background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
              {report.status.replace(/_/g, ' ')}
            </span>
            <span style={{ fontSize: '11px', color: report.priority === 'HIGH' ? '#f87171' : report.priority === 'MEDIUM' ? '#fbbf24' : '#737373', fontWeight: 600, fontFamily: 'Space Grotesk, sans-serif' }}>
              ● {report.priority}
            </span>
            <span style={{ fontSize: '11px', color: '#404040' }}>{report.issueType}</span>
            <span style={{ fontSize: '11px', color: '#333333' }}>→ {report.routeToDeptName}</span>
            {slaMs !== null && (
              <span style={{ fontSize: '11px', fontFamily: 'Space Grotesk, sans-serif', padding: '3px 8px', borderRadius: '4px', border: '1px solid', background: slaBreached ? 'rgba(248,113,113,0.08)' : slaMs < 3600000 ? 'rgba(251,191,36,0.08)' : '#0a0a0a', color: slaBreached ? '#f87171' : slaMs < 3600000 ? '#fbbf24' : '#404040', borderColor: slaBreached ? 'rgba(248,113,113,0.2)' : slaMs < 3600000 ? 'rgba(251,191,36,0.2)' : '#1a1a1a' }}>
                {slaBreached ? `⚠ SLA breached ${slaH}h ${slaM}m ago` : `SLA: ${slaH}h ${slaM}m left`}
              </span>
            )}
          </div>
        </div>

        {actions.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {actions.map(a => (
              <button key={a} onClick={() => setActiveAction(a)} style={{ padding: '7px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 500, fontFamily: 'Inter, sans-serif', transition: 'all 0.12s', ...ACTION_STYLE[a] }}>
                {ACTION_LABELS[a]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Meta grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '28px' }}>
        {[
          { label: 'Action Requested', value: report.actionRequested },
          { label: 'AI Confidence', value: report.aiConfidence != null ? `${Math.round(report.aiConfidence * 100)}%` : '—' },
          { label: 'Refund Amount', value: report.refundAmount != null ? `₹${report.refundAmount.toLocaleString('en-IN')}` : '—' },
          { label: 'Submitted', value: new Date(report.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: '#080808', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '14px 16px' }}>
            <p style={{ fontSize: '10px', color: '#333333', marginBottom: '4px', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</p>
            <p style={{ fontSize: '13px', color: '#a3a3a3', fontWeight: 500 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Resolution */}
      {report.resolution && (
        <div style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
          <p style={{ fontSize: '11px', color: '#34d399', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>Resolution</p>
          <p style={{ fontSize: '13px', color: '#a3a3a3', lineHeight: 1.6 }}>{report.resolution}</p>
        </div>
      )}

      {/* Escalations */}
      {report.escalations.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <p style={{ fontSize: '11px', color: '#333333', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Escalations ({report.escalations.length})
          </p>
          {report.escalations.map(esc => (
            <div key={esc.id} style={{ background: 'rgba(251,146,60,0.05)', border: '1px solid rgba(251,146,60,0.15)', borderRadius: '8px', padding: '16px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: '#fb923c', fontWeight: 600, fontFamily: 'Space Grotesk, sans-serif' }}>Level {esc.level}</span>
                <span style={{ fontSize: '11px', color: '#333333', fontFamily: 'Space Grotesk, sans-serif' }}>
                  {new Date(esc.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#a3a3a3', lineHeight: 1.6 }}>{esc.escalationReason}</p>
              {esc.decision && (
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(251,146,60,0.15)' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', fontFamily: 'Space Grotesk, sans-serif', background: esc.decision === 'OVERRIDE_APPROVE' ? 'rgba(52,211,153,0.08)' : esc.decision === 'UPHOLD_CLOSE' ? 'rgba(248,113,113,0.08)' : 'rgba(56,189,248,0.08)', color: esc.decision === 'OVERRIDE_APPROVE' ? '#34d399' : esc.decision === 'UPHOLD_CLOSE' ? '#f87171' : '#38bdf8' }}>
                    {esc.decision.replace(/_/g, ' ')}
                  </span>
                  {esc.resolutionNote && <p style={{ fontSize: '12px', color: '#737373', marginTop: '6px' }}>{esc.resolutionNote}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div>
        <p style={{ fontSize: '11px', color: '#333333', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px' }}>
          Timeline ({report.timeline.length})
        </p>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: '6px', top: '8px', bottom: '8px', width: '1px', background: '#1a1a1a' }} />
          {report.timeline.map(entry => (
            <div key={entry.id} style={{ display: 'flex', gap: '16px', marginBottom: '20px', position: 'relative' }}>
              <div style={{ width: '13px', height: '13px', borderRadius: '50%', background: TIMELINE_DOT[entry.actorRole], flexShrink: 0, marginTop: '2px', zIndex: 1, opacity: entry.isSystemEntry ? 0.35 : 1 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#a3a3a3' }}>
                    {entry.actor?.name ?? entry.actorId}
                  </span>
                  <span style={{ fontSize: '11px', color: '#333333' }}>{ROLE_LABEL[entry.actorRole]}</span>
                  {entry.fromStatus && (
                    <span style={{ fontSize: '11px', color: '#333333', fontFamily: 'Space Grotesk, sans-serif' }}>
                      {entry.fromStatus.replace(/_/g, ' ')} → <span style={{ color: '#737373' }}>{entry.toStatus.replace(/_/g, ' ')}</span>
                    </span>
                  )}
                  {!entry.fromStatus && (
                    <span style={{ fontSize: '11px', color: '#404040', fontFamily: 'Space Grotesk, sans-serif' }}>{entry.toStatus.replace(/_/g, ' ')}</span>
                  )}
                  {entry.isSystemEntry && <span style={{ fontSize: '10px', color: '#262626', fontStyle: 'italic' }}>system</span>}
                  <span style={{ fontSize: '11px', color: '#262626', fontFamily: 'Space Grotesk, sans-serif', marginLeft: 'auto' }}>
                    {new Date(entry.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
                {entry.note && (
                  <p style={{ fontSize: '13px', color: '#737373', background: '#080808', border: '1px solid #1a1a1a', borderRadius: '6px', padding: '10px 12px', lineHeight: 1.5 }}>
                    {entry.note}
                  </p>
                )}
                {entry.actionTaken && (
                  <p style={{ fontSize: '12px', color: '#34d399', marginTop: '4px' }}>Action: {entry.actionTaken}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {activeAction && (
        <ActionModal type={activeAction} reportId={report.id} onSuccess={() => { setActiveAction(null); fetchReport(); }} onClose={() => setActiveAction(null)} />
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}`}</style>
    </div>
  );
}