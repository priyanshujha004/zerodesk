'use client';

import { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ReportConfirmCard from './ReportConfirmCard';
import OrderPreviewCard from './OrderPreviewCard';

interface LineItem { title: string; quantity: number; price: number; vendor: string }

export interface OrderContext {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  lineItems: LineItem[];
  fulfillmentStatus: string;
  financialStatus: string;
  createdAt: string;
  daysSinceOrder: number;
  shopifyOrderId?: string;
}

interface Message { role: 'user' | 'assistant'; content: string }

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

interface Props {
  conversationId: string;
  customerEmail: string;
  tenantId: string;
  customerId: string;
  availableOrders: OrderContext[];
  onStartOver: () => void;
}

export default function ChatWindow({
  conversationId, customerEmail, tenantId, customerId, availableOrders, onStartOver,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [report, setReport] = useState<ReportJson | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [orderContext, setOrderContext] = useState<OrderContext | null>(null);

  // Dropdown state
  const [showOrderDropdown, setShowOrderDropdown] = useState(false);
  const [manualOrderInput, setManualOrderInput] = useState('');
  const [manualLookupError, setManualLookupError] = useState('');
  const [lookingUpManual, setLookingUpManual] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { void sendMessage(''); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streaming, showOrderDropdown]);

  async function sendMessage(userText: string, withOrder?: OrderContext) {
    const activeOrder = withOrder ?? orderContext ?? undefined;
    const newMessages: Message[] = userText
      ? [...messages, { role: 'user' as const, content: userText }]
      : messages;

    if (userText) setMessages(newMessages);
    setInput('');
    setStreaming(true);

    const res = await fetch('/api/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        messages: newMessages,
        orderContext: activeOrder,
        customerEmail,
      }),
    });

    if (!res.body) { setStreaming(false); return; }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let assistantText = '';

    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value, { stream: true }).split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') continue;
        try {
          const parsed = JSON.parse(raw) as {
            text?: string;
            reportJson?: ReportJson;
            needsOrder?: boolean;
            error?: string;
          };

          if (parsed.text) {
            // Strip <need_order/> from visible text
            const visible = parsed.text.replace('<need_order/>', '');
            if (visible) {
              assistantText += visible;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: assistantText };
                return updated;
              });
            }
          }

          if (parsed.needsOrder) setShowOrderDropdown(true);
          if (parsed.reportJson) setReport(parsed.reportJson);
        } catch { /* ignore */ }
      }
    }

    setStreaming(false);
  }

  async function handleOrderSelect(order: OrderContext) {
    setOrderContext(order);
    setShowOrderDropdown(false);
    // Inject order selection as a user message so AI has full context
    const selectionMsg = `I'd like help with order ${order.orderNumber} — ${order.lineItems.map(l => l.title).join(', ')}`;
    await sendMessage(selectionMsg, order);
  }

  async function handleManualLookup() {
    if (!manualOrderInput.trim()) return;
    setLookingUpManual(true);
    setManualLookupError('');
    const res = await fetch('/api/chat/lookup-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, orderNumber: manualOrderInput.trim() }),
    });
    const data = await res.json() as OrderContext & { error?: string };
    setLookingUpManual(false);
    if (data.error) { setManualLookupError('Order not found. Try again.'); return; }
    await handleOrderSelect(data);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || streaming) return;
    void sendMessage(input.trim());
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 rounded-full bg-[#6ee7b7]/20 border border-[#6ee7b7]/30 flex items-center justify-center mb-4">
          <span className="text-2xl text-[#6ee7b7]">✓</span>
        </div>
        <h3 className="text-white font-semibold mb-2">Request Submitted</h3>
        <p className="text-white/50 text-sm">You&apos;ll receive an update at {customerEmail} shortly.</p>
        <button onClick={onStartOver} className="mt-6 text-xs text-[#6ee7b7] hover:underline">Start a new request</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.map((m, i) => <ChatMessage key={i} role={m.role} content={m.content} />)}

        {/* Typing indicator */}
        {streaming && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start mb-3">
            <div className="bg-[#1c1c28] border border-white/5 rounded-2xl rounded-bl-sm px-4 py-2.5">
              <span className="inline-flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
            </div>
          </div>
        )}

        {/* Order selection dropdown — appears when AI signals <need_order/> */}
        {showOrderDropdown && !orderContext && (
          <div className="my-4 rounded-2xl border border-[#6ee7b7]/20 bg-[#12121a] p-4">
            <p className="text-xs text-[#6ee7b7] font-mono tracking-widest uppercase mb-3">Select Your Order</p>

            {availableOrders.length > 0 ? (
              <div className="space-y-2 mb-4">
                {availableOrders.map((o) => (
                  <button
                    key={o.orderNumber}
                    onClick={() => void handleOrderSelect(o)}
                    className="w-full text-left rounded-xl border border-white/10 bg-white/5 hover:border-[#6ee7b7]/40 hover:bg-[#6ee7b7]/5 px-4 py-3 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-white text-sm font-medium">{o.orderNumber}</span>
                      <span className="text-white/40 text-xs">{o.daysSinceOrder}d ago</span>
                    </div>
                    <div className="text-white/50 text-xs mt-0.5 truncate">
                      {o.lineItems.map(l => l.title).join(', ')}
                    </div>
                    <div className="text-white/70 text-xs mt-1">₹{(o.totalAmount / 100).toLocaleString('en-IN')}</div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-white/40 text-sm mb-3">No orders found for your email.</p>
            )}

            {/* Manual fallback */}
            <div className="border-t border-white/5 pt-3">
              <p className="text-white/30 text-xs mb-2">Or enter order number manually</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualOrderInput}
                  onChange={(e) => setManualOrderInput(e.target.value)}
                  placeholder="#4521"
                  className="flex-1 bg-[#0a0a0f] border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#6ee7b7]/40"
                />
                <button
                  onClick={() => void handleManualLookup()}
                  disabled={lookingUpManual}
                  className="px-3 rounded-xl bg-[#6ee7b7] text-[#0a0a0f] text-sm font-semibold hover:bg-[#5dd4a4] disabled:opacity-40 transition-colors"
                >
                  {lookingUpManual ? '…' : 'Go'}
                </button>
              </div>
              {manualLookupError && <p className="text-red-400 text-xs mt-1">{manualLookupError}</p>}
            </div>
          </div>
        )}

        {/* Report card */}
        {report && (
          <div className="mt-4">
            <ReportConfirmCard
              report={report}
              order={orderContext}
              conversationId={conversationId}
              tenantId={tenantId}
              customerId={customerId}
              rawConversation={messages}
              onSubmitted={() => setSubmitted(true)}
              onStartOver={onStartOver}
            />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {!report && (
        <form onSubmit={handleSubmit} className="border-t border-white/5 p-4 flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={streaming || showOrderDropdown}
            placeholder={showOrderDropdown ? 'Select an order above first…' : 'Type a message…'}
            className="flex-1 bg-[#1c1c28] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#6ee7b7]/40 disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={!input.trim() || streaming || showOrderDropdown}
            className="px-4 rounded-xl bg-[#6ee7b7] text-[#0a0a0f] text-sm font-semibold hover:bg-[#5dd4a4] disabled:opacity-40 transition-colors"
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}