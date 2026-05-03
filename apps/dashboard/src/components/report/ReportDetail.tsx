// TODO P4: ReportDetail
// apps/dashboard/src/components/report/ReportDetail.tsx
 
'use client';
 
import RefundStatus from './RefundStatus';
import Timeline, { TimelineEntry } from './Timeline';
 
export interface ReportData {
  id: string;
  status: string;
  priority: string;
  autoResolved: boolean;
  autoResolveReason: string | null;
  slaDeadline: string | null;
  // Order
  shopifyOrderId: string | null;
  shopifyOrderNumber: string | null;
  orderItems: string | null;
  orderTotal: number | null;
  orderDate: string | null;
  // Refund
  refundInitiated: boolean;
  refundAmount: number | null;
  razorpayRefundId: string | null;
  refundInitiatedAt: string | null;
  // Timeline
  timeline: TimelineEntry[];
}
 
interface ReportDetailProps {
  report: ReportData;
}
 
// ─── Status config ────────────────────────────────────────────────────────────
 
const STATUS_CONFIG: Record<
  string,
  { label: string; classes: string }
> = {
  AUTO_RESOLVED: {
    label: '⚡ Auto-Resolved',
    classes: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
  },
  PENDING_CDA: {
    label: 'Pending Review',
    classes: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
  },
  APPROVED_TO_DEPT: {
    label: 'Approved',
    classes: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',
  },
  COMPLETED: {
    label: 'Completed',
    classes: 'bg-green-500/20 text-green-300 border border-green-500/40',
  },
  REJECTED: {
    label: 'Rejected',
    classes: 'bg-red-500/20 text-red-300 border border-red-500/40',
  },
  ESCALATED: {
    label: 'Escalated',
    classes: 'bg-orange-500/20 text-orange-300 border border-orange-500/40',
  },
  RESOLVED: {
    label: 'Resolved',
    classes: 'bg-green-500/20 text-green-300 border border-green-500/40',
  },
  CLOSED: {
    label: 'Closed',
    classes: 'bg-gray-500/20 text-gray-400 border border-gray-500/40',
  },
};
 
const PRIORITY_CONFIG: Record<string, string> = {
  HIGH: 'bg-red-500/20 text-red-300',
  MEDIUM: 'bg-yellow-500/20 text-yellow-300',
  LOW: 'bg-gray-500/20 text-gray-400',
};
 
function statusConfig(status: string) {
  return (
    STATUS_CONFIG[status] ?? {
      label: status,
      classes: 'bg-gray-500/20 text-gray-400 border border-gray-500/40',
    }
  );
}
 
// ─── SLA Countdown ───────────────────────────────────────────────────────────
 
function SlaCountdown({ deadline }: { deadline: string }) {
  const remaining = new Date(deadline).getTime() - Date.now();
  const hours = Math.floor(remaining / 3600000);
  const isBreached = remaining < 0;
 
  return (
    <span
      className={`text-xs ${isBreached ? 'text-red-400' : 'text-gray-400'}`}
    >
      {isBreached ? '⚠ SLA breached' : `SLA: ${hours}h remaining`}
    </span>
  );
}
 
// ─── Main Component ───────────────────────────────────────────────────────────
 
export default function ReportDetail({ report }: ReportDetailProps) {
  const sc = statusConfig(report.status);
  const pc = PRIORITY_CONFIG[report.priority] ?? PRIORITY_CONFIG.MEDIUM;
 
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-4 sm:p-8 max-w-4xl mx-auto">
      {/* ── Top section ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        {/* Left */}
        <div>
          {/* Report ID pill */}
          <div className="mb-2">
            <span className="text-xs font-mono text-gray-500 bg-white/5 px-2.5 py-1 rounded-full">
              {report.id}
            </span>
          </div>
 
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full ${sc.classes}`}
            >
              {sc.label}
            </span>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${pc}`}
            >
              {report.priority} Priority
            </span>
          </div>
        </div>
 
        {/* SLA */}
        <div className="text-right">
          {report.autoResolved ? (
            <span className="text-xs text-emerald-400">
              ⚡ Auto-processed
            </span>
          ) : report.slaDeadline ? (
            <SlaCountdown deadline={report.slaDeadline} />
          ) : null}
        </div>
      </div>
 
      {/* ── Order info ─────────────────────────────────────────────── */}
      {report.shopifyOrderNumber && (
        <section className="mb-6 rounded-xl border border-white/5 bg-[#12121a] p-5">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Order Info
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <OrderField label="Order #" value={`#${report.shopifyOrderNumber}`} />
            {report.orderDate && (
              <OrderField
                label="Date"
                value={new Date(report.orderDate).toLocaleDateString('en-IN')}
              />
            )}
            {report.orderTotal && (
              <OrderField
                label="Total"
                value={`₹${(report.orderTotal / 100).toLocaleString('en-IN')}`}
              />
            )}
            {report.orderItems && (
              <OrderField label="Items" value={report.orderItems} />
            )}
          </div>
        </section>
      )}
 
      {/* ── Refund status ──────────────────────────────────────────── */}
      {report.refundInitiated &&
        report.refundAmount &&
        report.razorpayRefundId &&
        report.refundInitiatedAt && (
          <section className="mb-6">
            <RefundStatus
              refundAmount={report.refundAmount}
              razorpayRefundId={report.razorpayRefundId}
              refundInitiatedAt={report.refundInitiatedAt}
            />
          </section>
        )}
 
      {/* ── Audit timeline ─────────────────────────────────────────── */}
      <Timeline
        entries={report.timeline}
        autoResolved={report.autoResolved}
        autoResolveReason={report.autoResolveReason}
      />
    </div>
  );
}
 
function OrderField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm text-gray-200 font-medium">{value}</p>
    </div>
  );
}
