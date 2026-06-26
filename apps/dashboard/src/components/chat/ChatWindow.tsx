'use client';

import { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ReportConfirmCard from './ReportConfirmCard';

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
  const [showOrderDropdown, setShowOrderDropdown] = useState(false);
  const [manualOrderInput, setManualOrderInput] = useState('');
  const [manualLookupError, setManualLookupError] = useState('');
  const [lookingUpManual, setLookingUpManual] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { void sendMessage(''); }, []);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming, showOrderDropdown]);

  async function sendMessage(userText: string, withOrder?: OrderContext) {
    const activeOrder = withOrder ?? orderContext ?? undefined;
    const newMessages: Message[] = userText
      ? [...messages, { role: 'user' as const, content: userText }]
      : messages;

    if (userText) setMessages(newMessages);
    setInput('');
    setStreaming(true);

    // ── Fix: was /api/chat/message (dead endpoint) → /api/chat/gemini-message ──
    const res = await fetch('/api/chat/gemini-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: newMessages,
        orderContext: activeOrder,
        customerEmail,
        tenantId,
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
            needsEmail?: boolean;
            error?: string;
          };

          if (parsed.text) {
            assistantText += parsed.text;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: 'assistant', content: assistantText };
              return updated;
            });
          }

          // Show order dropdown when AI needs email/order context
          if (parsed.needsEmail) setShowOrderDropdown(true);
          if (parsed.reportJson) setReport(parsed.reportJson);

        } catch { /* ignore malformed chunks */ }
      }
    }

    setStreaming(false);
  }

  async function handleOrderSelect(order: OrderContext) {
    setOrderContext(order);
    setShowOrderDropdown(false);
    const selectionMsg = `I'd like help with order ${order.orderNumber} — ${order.lineItems.map((l) => l.title).join(', ')}`;
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
      <div
        style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          height: '100%', textAlign: 'center', padding: '32px',
        }}
      >
        <div
          style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'var(--acid-dim)', border: '1px solid var(--acid-glow)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '16px',
            fontSize: '24px',
          }}
        >
          ✓
        </div>
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '18px', fontWeight: 700,
            color: 'var(--text-1)', marginBottom: '8px',
          }}
        >
          Request Submitted
        </h3>
        <p style={{ color: 'var(--text-2)', fontSize: '14px', marginBottom: '24px' }}>
          You&apos;ll receive an update at {customerEmail} shortly.
        </p>
        <button
          onClick={onStartOver}
          className="btn btn-ghost"
          style={{ fontSize: '12px' }}
        >
          Start a new request
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {messages.map((m, i) => (
          <ChatMessage key={i} role={m.role} content={m.content} />
        ))}

        {/* Typing indicator */}
        {streaming && messages[messages.length - 1]?.role !== 'assistant' && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '12px' }}>
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                borderBottomLeftRadius: '4px',
                padding: '10px 14px',
              }}
            >
              <span style={{ display: 'inline-flex', gap: '4px' }}>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: 'var(--text-3)',
                      display: 'inline-block',
                      animation: 'bounce 1s infinite',
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}

        {/* Order selection */}
        {showOrderDropdown && !orderContext && (
          <div
            style={{
              margin: '16px 0',
              background: 'var(--bg-3)',
              border: '1px solid var(--acid-glow)',
              borderRadius: '16px',
              padding: '16px',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--acid)',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                marginBottom: '12px',
              }}
            >
              Select Your Order
            </p>

            {availableOrders.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {availableOrders.map((o) => (
                  <button
                    key={o.orderNumber}
                    onClick={() => void handleOrderSelect(o)}
                    style={{
                      textAlign: 'left',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: '12px',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s',
                      width: '100%',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--acid-glow)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--acid)', fontWeight: 500 }}>
                        {o.orderNumber}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>
                        {o.daysSinceOrder}d ago
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-2)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {o.lineItems.map((l) => l.title).join(', ')}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-1)' }}>
                      ₹{(o.totalAmount / 100).toLocaleString('en-IN')}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-3)', fontSize: '13px', marginBottom: '12px' }}>
                No orders found for your email.
              </p>
            )}

            {/* Manual fallback */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)', marginBottom: '8px' }}>
                Or enter order number manually
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={manualOrderInput}
                  onChange={(e) => setManualOrderInput(e.target.value)}
                  placeholder="#4521"
                  className="input"
                  style={{ flex: 1 }}
                />
                <button
                  onClick={() => void handleManualLookup()}
                  disabled={lookingUpManual}
                  className="btn btn-primary"
                  style={{ padding: '10px 16px', opacity: lookingUpManual ? 0.6 : 1 }}
                >
                  {lookingUpManual ? '…' : 'Go'}
                </button>
              </div>
              {manualLookupError && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--red)', marginTop: '4px' }}>
                  {manualLookupError}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Report confirmation card */}
        {report && (
          <div style={{ marginTop: '16px' }}>
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

      {/* Input */}
      {!report && (
        <form
          onSubmit={handleSubmit}
          style={{
            borderTop: '1px solid var(--border)',
            padding: '16px',
            display: 'flex',
            gap: '12px',
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={streaming || showOrderDropdown}
            placeholder={showOrderDropdown ? 'Select an order above first…' : 'Type a message…'}
            className="input"
            style={{ flex: 1, opacity: (streaming || showOrderDropdown) ? 0.5 : 1 }}
          />
          <button
            type="submit"
            disabled={!input.trim() || streaming || showOrderDropdown}
            className="btn btn-primary"
            style={{ padding: '10px 16px' }}
          >
            Send
          </button>
        </form>
      )}

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}