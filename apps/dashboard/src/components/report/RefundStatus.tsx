// apps/dashboard/src/components/report/RefundStatus.tsx

interface RefundStatusProps {
  refundAmount: number; // paise
  razorpayRefundId: string;
  refundInitiatedAt: string; // ISO date string
}

export default function RefundStatus({
  refundAmount,
  razorpayRefundId,
  refundInitiatedAt,
}: RefundStatusProps) {
  const rupees = (refundAmount / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
  });

  const date = new Date(refundInitiatedAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20">
          <svg
            className="h-4 w-4 text-emerald-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </span>
        <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">
          Refund Initiated
        </h3>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <DetailRow label="Amount">
          <span className="text-emerald-300 font-semibold text-lg">
            ₹{rupees}
          </span>
        </DetailRow>

        <DetailRow label="Initiated at">
          <span className="text-gray-200 text-sm">{date}</span>
        </DetailRow>

        <DetailRow label="Razorpay Refund ID" fullWidth>
          <code className="text-xs font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded">
            {razorpayRefundId}
          </code>
        </DetailRow>
      </div>

      {/* ETA notice */}
      <div className="mt-4 flex items-center gap-2 text-xs text-emerald-400/80">
        <svg
          className="h-3.5 w-3.5 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Expected in 5-7 business days
      </div>
    </div>
  );
}

function DetailRow({
  label,
  children,
  fullWidth,
}: {
  label: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? 'sm:col-span-2' : ''}>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      {children}
    </div>
  );
}