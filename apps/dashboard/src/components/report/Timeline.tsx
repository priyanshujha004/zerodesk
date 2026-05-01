// TODO P4: Timeline
// apps/dashboard/src/components/report/Timeline.tsx
 
export interface TimelineEntry {
  id: string;
  status: string;
  note: string | null;
  actorName: string | null;
  actorRole: string | null;
  isSystemEntry: boolean;
  createdAt: string;
}
 
interface TimelineProps {
  entries: TimelineEntry[];
  autoResolved: boolean;
  autoResolveReason: string | null;
}
 
const STATUS_COLORS: Record<string, string> = {
  PENDING_CDA: 'bg-amber-400',
  APPROVED_TO_DEPT: 'bg-blue-400',
  REJECTED: 'bg-red-500',
  COMPLETED: 'bg-green-400',
  ESCALATED: 'bg-orange-400',
  RESOLVED: 'bg-green-500',
  CLOSED: 'bg-gray-400',
  INFO_REQUESTED: 'bg-purple-400',
  NEW_REPORT_ASSIGNED: 'bg-sky-400',
  AUTO_RESOLVED: 'bg-emerald-400',
  SUBMITTED: 'bg-gray-500',
};
 
function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? 'bg-gray-500';
}
 
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { dateStyle: 'medium' });
}
 
export default function Timeline({
  entries,
  autoResolved,
  autoResolveReason,
}: TimelineProps) {
  return (
    <div className="rounded-xl border border-white/5 bg-[#12121a] p-5">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-5">
        Audit Timeline
      </h3>
 
      <ol className="relative border-l border-white/10 ml-2 space-y-0">
        {/* AI auto-resolve entry pinned at top */}
        {autoResolved && (
          <TimelineItem
            dotClass="bg-emerald-400 ring-emerald-400/30"
            badge="AUTO_RESOLVED"
            badgeClass="bg-emerald-500/20 text-emerald-300"
            actor="ResolveIQ AI 🤖"
            note={autoResolveReason ? `⚡ Auto-resolved by AI — ${autoResolveReason}` : '⚡ Auto-resolved by AI'}
            time={entries[0]?.createdAt ?? new Date().toISOString()}
            isFirst
          />
        )}
 
        {entries.map((entry, i) => (
          <TimelineItem
            key={entry.id}
            dotClass={statusColor(entry.status)}
            badge={entry.status}
            badgeClass="bg-white/5 text-gray-400"
            actor={
              entry.isSystemEntry
                ? 'ResolveIQ AI 🤖'
                : `${entry.actorName ?? 'Unknown'} (${entry.actorRole ?? '—'})`
            }
            note={entry.note}
            time={entry.createdAt}
            isFirst={!autoResolved && i === 0}
          />
        ))}
      </ol>
    </div>
  );
}
 
function TimelineItem({
  dotClass,
  badge,
  badgeClass,
  actor,
  note,
  time,
  isFirst,
}: {
  dotClass: string;
  badge: string;
  badgeClass: string;
  actor: string;
  note: string | null;
  time: string;
  isFirst?: boolean;
}) {
  return (
    <li className={`pl-6 pb-6 ${isFirst ? '' : ''} relative`}>
      {/* Dot */}
      <span
        className={`absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-[#0a0a0f] ${dotClass}`}
      />
 
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <span
          className={`text-xs font-mono px-2 py-0.5 rounded-full ${badgeClass}`}
        >
          {badge}
        </span>
        <span className="text-xs text-gray-500">by {actor}</span>
        <span className="text-xs text-gray-600 ml-auto">{timeAgo(time)}</span>
      </div>
 
      {note && (
        <p className="text-sm text-gray-400 leading-relaxed">{note}</p>
      )}
    </li>
  );
}
