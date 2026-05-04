'use client';

interface ReportJson {
  issueType: string;
  issueSummary: string;
  actionRequested: string;
  routeToDept: string;
  priority: string;
  aiConfidence: number;
  eligible: boolean;
  eligibilityReason: string;
  recommendedAction: 'AUTO_REFUND' | 'MANUAL_REVIEW' | 'REJECT';
  refundAmount: number | null;
  shopifyOrderId: string;
}

interface Order {
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  lineItems: { title: string; quantity: number; price: number }[];
}

interface Props {
  report: ReportJson;
  order: Order | null;
  conversationId: string;
  tenantId: string;
  customerId: string;
  rawConversation: Array<{ role: string; content: string }>;
  onSubmitted: () => void;
  onStartOver: () => void;
}

const actionConfig = {
  AUTO_REFUND: { label: 'Will be auto-processed', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  MANUAL_REVIEW: { label: 'Goes to review team', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  REJECT: { label: 'Not eligible', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

export default function ReportConfirmCard({
  report, order, conversationId, tenantId, customerId, rawConversation, onSubmitted, onStartOver,
}: Props) {
  const action = actionConfig[report.recommendedAction];

  async function handleConfirm() {
    await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId,
        customerId,
        conversationId,
        issueType: report.issueType,
        issueSummary: report.issueSummary,
        actionRequested: report.actionRequested,
        routeToDeptName: report.routeToDept,
        priority: report.priority,
        aiConfidence: report.aiConfidence,
        eligible: report.eligible,
        recommendedAction: report.recommendedAction,
        refundAmount: report.refundAmount,
        shopifyOrderId: report.shopifyOrderId,
        shopifyOrderNumber: order?.orderNumber ?? '',
        rawConversation,
      }),
    });
    onSubmitted();
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#12121a] p-5 w-full">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-mono text-[#6ee7b7] tracking-widest uppercase">Resolution Summary</span>
      </div>

      {order && (
        <div className="mb-4 p-3 rounded-xl bg-white/5 text-sm">
          <div className="font-semibold text-white">{order.orderNumber}</div>
          <div className="text-white/50 text-xs mt-1">
            {order.lineItems.map((li) => `${li.quantity}× ${li.title}`).join(', ')}
          </div>
          <div className="text-white/70 mt-1">₹{(order.totalAmount / 100).toLocaleString('en-IN')}</div>
        </div>
      )}

      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          {report.eligible
            ? <span className="text-emerald-400 text-sm">✓ Eligible for return</span>
            : <span className="text-red-400 text-sm">✗ Not eligible</span>}
        </div>
        <p className="text-white/50 text-xs">{report.eligibilityReason}</p>
      </div>

      <div className={`inline-flex items-center px-3 py-1.5 rounded-lg border text-xs font-medium mb-3 ${action.className}`}>
        {action.label}
      </div>

      {report.refundAmount !== null && report.refundAmount > 0 && (
        <div className="mb-4 text-sm text-white/70">
          Refund amount: <span className="text-white font-semibold">₹{(report.refundAmount / 100).toLocaleString('en-IN')}</span>
        </div>
      )}

      <p className="text-xs text-white/40 mb-5">{report.issueSummary}</p>

      <div className="flex gap-3">
        <button
          onClick={handleConfirm}
          className="flex-1 rounded-xl bg-[#6ee7b7] text-[#0a0a0f] text-sm font-semibold py-3 hover:bg-[#5dd4a4] transition-colors"
        >
          Confirm & Submit
        </button>
        <button
          onClick={onStartOver}
          className="px-4 rounded-xl border border-white/10 text-white/50 text-sm hover:border-white/20 hover:text-white/70 transition-colors"
        >
          Start Over
        </button>
      </div>
    </div>
  );
}