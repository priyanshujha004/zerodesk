'use client';

interface LineItem {
  title: string;
  quantity: number;
  price: number;
  vendor: string;
}

interface Order {
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  lineItems: LineItem[];
  fulfillmentStatus: string;
  financialStatus: string;
  createdAt: string;
  daysSinceOrder: number;
}

interface Props {
  order: Order;
  onStartChat: () => void;
}

const statusColor: Record<string, string> = {
  fulfilled: 'text-emerald-400',
  unfulfilled: 'text-amber-400',
  partial: 'text-blue-400',
  paid: 'text-emerald-400',
  refunded: 'text-red-400',
  pending: 'text-amber-400',
};

export default function OrderPreviewCard({ order, onStartChat }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#12121a] p-5 w-full max-w-sm">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-mono text-[#6ee7b7] tracking-widest uppercase">Order Found</span>
        <span className="text-xs text-white/40">{order.daysSinceOrder}d ago</span>
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-2xl font-bold text-white">{order.orderNumber}</span>
        <span className="text-sm text-white/50">· {order.customerName}</span>
      </div>

      <div className="text-3xl font-semibold text-white mb-4">
        ₹{(order.totalAmount / 100).toLocaleString('en-IN')}
      </div>

      <div className="space-y-2 mb-4">
        {order.lineItems.map((li, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-white/70 truncate max-w-[60%]">{li.quantity}× {li.title}</span>
            <span className="text-white/50">₹{(li.price / 100).toLocaleString('en-IN')}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mb-5 text-xs">
        <span className={`capitalize ${statusColor[order.fulfillmentStatus] ?? 'text-white/50'}`}>
          ● {order.fulfillmentStatus}
        </span>
        <span className={`capitalize ${statusColor[order.financialStatus] ?? 'text-white/50'}`}>
          ● {order.financialStatus}
        </span>
      </div>

      <button
        onClick={onStartChat}
        className="w-full rounded-xl bg-[#6ee7b7] text-[#0a0a0f] text-sm font-semibold py-3 hover:bg-[#5dd4a4] transition-colors"
      >
        Start Chat →
      </button>
    </div>
  );
}