'use client';

import { useState, useRef, useEffect } from 'react';

const TENANT_ID = 'tenant_demo';
const API = '/api/chat';

interface LineItem { title: string; quantity: number; price: number; vendor: string }
interface OrderContext {
  orderNumber: string; customerName: string; customerEmail: string;
  totalAmount: number; lineItems: LineItem[]; fulfillmentStatus: string;
  financialStatus: string; createdAt: string; daysSinceOrder: number;
  shopifyOrderId?: string;
}
interface Message { role: 'user' | 'assistant'; content: string }
interface ReportJson {
  issueType: string; issueSummary: string; actionRequested: string;
  routeToDept: string; priority: string; aiConfidence: number;
  eligible: boolean; eligibilityReason: string;
  recommendedAction: 'AUTO_REFUND' | 'MANUAL_REVIEW' | 'REJECT';
  refundAmount: number | null; shopifyOrderId: string;
}

type OtpStep = 'idle' | 'awaiting_otp' | 'verified';

const ACTION_CONFIG = {
  AUTO_REFUND: { label: 'Will be auto-processed', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  MANUAL_REVIEW: { label: 'Goes to review team', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  REJECT: { label: 'Not eligible', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
};

function extractReport(text: string): ReportJson | null {
  const open = text.indexOf('<report>');
  const close = text.indexOf('</report>');
  if (open === -1 || close === -1) return null;
  try {
    return JSON.parse(text.slice(open + 8, close).trim()) as ReportJson;
  } catch { return null; }
}

function stripReport(text: string): string {
  const open = text.indexOf('<report>');
  return open !== -1 ? text.slice(0, open).trim() : text;
}

export default function WidgetPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [orderContext, setOrderContext] = useState<OrderContext | null>(null);
  const [report, setReport] = useState<ReportJson | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [otpStep, setOtpStep] = useState<OtpStep>('idle');
  const [emailInput, setEmailInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [needsEmail, setNeedsEmail] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { void sendToGemini('Hello'); }, []);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming, otpStep, report]);

  async function sendToGemini(userText: string, withOrder?: OrderContext, withEmail?: string) {
    const activeOrder = withOrder ?? orderContext ?? undefined;
    const activeEmail = withEmail ?? customerEmail ?? undefined;

    const newMessages: Message[] = userText
      ? [...messages, { role: 'user' as const, content: userText }]
      : messages;

    if (userText) setMessages(newMessages);
    setInput('');
    setStreaming(true);

    const res = await fetch(`${API}/gemini-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: newMessages,
        orderContext: activeOrder,
        customerEmail: activeEmail,
        tenantId: TENANT_ID,
      }),
    });

    if (!res.body) { setStreaming(false); return; }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let assistantText = '';
    let buffer = '';

    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') continue;
        try {
          const parsed = JSON.parse(raw) as {
            text?: string; needsEmail?: boolean;
            reportJson?: ReportJson; error?: string;
          };
          if (parsed.error) { console.error('Gemini error:', parsed.error); continue; }

          if (parsed.text) {
            assistantText += parsed.text;
            // Check if report tag is complete in accumulated text
            const extractedReport = extractReport(assistantText);
            if (extractedReport) {
              setReport(extractedReport);
            }
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: 'assistant',
                content: stripReport(assistantText),
              };
              return updated;
            });
          }
          if (parsed.needsEmail) setNeedsEmail(true);
          if (parsed.reportJson) setReport(parsed.reportJson);
        } catch { /* skip */ }
      }
    }

    // Final check on full accumulated text
    const finalReport = extractReport(assistantText);
    if (finalReport) setReport(finalReport);

    setStreaming(false);
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setSendingOtp(true);
    await fetch(`${API}/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailInput }),
    });
    setSendingOtp(false);
    setNeedsEmail(false);
    setOtpStep('awaiting_otp');
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setOtpError('');
    setVerifyingOtp(true);

    const verifyRes = await fetch(`${API}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailInput, code: otpInput }),
    });
    const { valid } = await verifyRes.json() as { valid: boolean };

    if (!valid) { setOtpError('Invalid or expired code.'); setVerifyingOtp(false); return; }

    const ordersRes = await fetch(`${API}/orders-by-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: TENANT_ID, email: emailInput }),
    });
    const orders = await ordersRes.json() as OrderContext[];

    setCustomerEmail(emailInput);
    setNeedsEmail(false);
    setOtpStep('verified');
    setVerifyingOtp(false);

    const firstOrder = orders[0] ?? undefined;
    if (firstOrder) setOrderContext(firstOrder);

    const systemMsg = firstOrder
      ? `My email is ${emailInput}. Verified. My order is ${firstOrder.orderNumber} — ${firstOrder.lineItems.map(l => l.title).join(', ')}.`
      : `My email is ${emailInput}. Verified. I don't have a recent order.`;

    await sendToGemini(systemMsg, firstOrder, emailInput);
  }

  async function handleConfirmReport() {
    if (!report) return;
    await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: TENANT_ID,
        customerId: customerEmail || 'guest',
        conversationId: 'widget-' + Date.now(),
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
        shopifyOrderNumber: orderContext?.orderNumber ?? '',
        rawConversation: messages,
      }),
    });
    setSubmitted(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || streaming || !!report) return;
    void sendToGemini(input.trim());
  }

  const showEmailCapture = needsEmail && otpStep !== 'verified' && otpStep !== 'awaiting_otp';

  if (submitted) {
    return (
      <div className="flex flex-col h-screen bg-[#0a0a0f] items-center justify-center text-center p-8">
        <div className="w-16 h-16 rounded-full bg-[#6ee7b7]/20 border border-[#6ee7b7]/30 flex items-center justify-center mb-4">
          <span className="text-2xl text-[#6ee7b7]">✓</span>
        </div>
        <h3 className="text-white font-semibold mb-2">Request Submitted</h3>
        <p className="text-white/50 text-sm">Your return has been logged. Our team will process it shortly.</p>
        <button onClick={() => { setSubmitted(false); setReport(null); setMessages([]); setOtpStep('idle'); void sendToGemini('Hello'); }}
          className="mt-6 text-xs text-[#6ee7b7] hover:underline">
          Start a new request
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0f] text-white font-sans">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-[#12121a]">
        <div className="w-8 h-8 rounded-full bg-[#6ee7b7]/20 border border-[#6ee7b7]/30 flex items-center justify-center shrink-0">
          <span className="text-xs text-[#6ee7b7] font-bold">SE</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Aria · ShopEase Support</p>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#6ee7b7] animate-pulse" />
            <span className="text-xs text-white/40">AI-powered · typically replies instantly</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.content.trim() && (
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-[#6ee7b7] text-[#0a0a0f] rounded-br-sm'
                  : 'bg-[#1c1c28] text-white/90 rounded-bl-sm border border-white/5'
              }`}>
                {m.content}
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {streaming && (
          <div className="flex justify-start">
            <div className="bg-[#1c1c28] border border-white/5 rounded-2xl rounded-bl-sm px-4 py-3">
              <span className="inline-flex gap-1">
                {[0,1,2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
            </div>
          </div>
        )}

        {/* Email capture */}
        {showEmailCapture && (
          <div className="rounded-2xl border border-[#6ee7b7]/20 bg-[#12121a] p-4 mx-1">
            <p className="text-xs text-[#6ee7b7] font-mono tracking-widest uppercase mb-3">Verify Your Email</p>
            <form onSubmit={handleSendOtp} className="flex gap-2">
              <input type="email" required value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 bg-[#0a0a0f] border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#6ee7b7]/40" />
              <button type="submit" disabled={sendingOtp}
                className="px-3 rounded-xl bg-[#6ee7b7] text-[#0a0a0f] text-sm font-semibold hover:bg-[#5dd4a4] disabled:opacity-40 transition-colors">
                {sendingOtp ? '…' : 'Send'}
              </button>
            </form>
          </div>
        )}

        {/* OTP */}
        {otpStep === 'awaiting_otp' && (
          <div className="rounded-2xl border border-[#6ee7b7]/20 bg-[#12121a] p-4 mx-1">
            <p className="text-xs text-[#6ee7b7] font-mono tracking-widest uppercase mb-1">Enter Code</p>
            <p className="text-white/40 text-xs mb-3">Sent to {emailInput}</p>
            <form onSubmit={handleVerifyOtp} className="flex gap-2">
              <input type="text" value={otpInput}
                onChange={e => setOtpInput(e.target.value.replace(/\D/g,'').slice(0,6))}
                placeholder="123456" maxLength={6}
                className="flex-1 bg-[#0a0a0f] border border-white/10 rounded-xl px-3 py-2 text-white text-sm text-center tracking-[0.4em] placeholder-white/20 focus:outline-none focus:border-[#6ee7b7]/40" />
              <button type="submit" disabled={otpInput.length !== 6 || verifyingOtp}
                className="px-3 rounded-xl bg-[#6ee7b7] text-[#0a0a0f] text-sm font-semibold hover:bg-[#5dd4a4] disabled:opacity-40 transition-colors">
                {verifyingOtp ? '…' : 'Verify'}
              </button>
            </form>
            {otpError && <p className="text-red-400 text-xs mt-2">{otpError}</p>}
          </div>
        )}

        {/* Report Confirm Card */}
        {report && !streaming && (
          <div className="rounded-2xl border border-white/10 bg-[#12121a] p-4 mx-1">
            <p className="text-xs text-[#6ee7b7] font-mono tracking-widest uppercase mb-3">Resolution Summary</p>

            {orderContext && (
              <div className="mb-3 p-3 rounded-xl bg-white/5 text-sm">
                <div className="font-semibold text-white">{orderContext.orderNumber}</div>
                <div className="text-white/50 text-xs mt-0.5">
                  {orderContext.lineItems.map(l => `${l.quantity}× ${l.title}`).join(', ')}
                </div>
                <div className="text-white/70 text-xs mt-1">
                  ₹{(orderContext.totalAmount / 100).toLocaleString('en-IN')}
                </div>
              </div>
            )}

            <div className="mb-2">
              {report.eligible
                ? <span className="text-emerald-400 text-sm">✓ Eligible for return</span>
                : <span className="text-red-400 text-sm">✗ Not eligible</span>}
              <p className="text-white/40 text-xs mt-1">{report.eligibilityReason}</p>
            </div>

            {(() => {
              const cfg = ACTION_CONFIG[report.recommendedAction] ?? ACTION_CONFIG.MANUAL_REVIEW;
              return (
                <div className={`inline-flex items-center px-3 py-1.5 rounded-lg border text-xs font-medium mb-3 ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                  {cfg.label}
                </div>
              );
            })()}

            {report.refundAmount && report.refundAmount > 0 && (
              <div className="text-sm text-white/70 mb-3">
                Refund: <span className="text-white font-semibold">
                  ₹{(report.refundAmount / 100).toLocaleString('en-IN')}
                </span>
              </div>
            )}

            <p className="text-xs text-white/30 mb-4">{report.issueSummary}</p>

            <div className="flex gap-2">
              <button onClick={() => void handleConfirmReport()}
                className="flex-1 rounded-xl bg-[#6ee7b7] text-[#0a0a0f] text-sm font-semibold py-2.5 hover:bg-[#5dd4a4] transition-colors">
                Confirm & Submit
              </button>
              <button onClick={() => { setReport(null); setMessages([]); void sendToGemini('Hello'); }}
                className="px-3 rounded-xl border border-white/10 text-white/50 text-sm hover:border-white/20 transition-colors">
                Start Over
              </button>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input — disabled once report appears */}
      {!report && (
        <form onSubmit={handleSubmit} className="border-t border-white/5 p-3 flex gap-2 bg-[#12121a]">
          <input type="text" value={input}
            onChange={e => setInput(e.target.value)}
            disabled={streaming || otpStep === 'awaiting_otp'}
            placeholder={otpStep === 'awaiting_otp' ? 'Verify your email first…' : 'Type a message…'}
            className="flex-1 bg-[#1c1c28] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#6ee7b7]/40 disabled:opacity-40" />
          <button type="submit" disabled={!input.trim() || streaming || otpStep === 'awaiting_otp'}
            className="px-4 rounded-xl bg-[#6ee7b7] text-[#0a0a0f] text-sm font-semibold hover:bg-[#5dd4a4] disabled:opacity-40 transition-colors">
            ↑
          </button>
        </form>
      )}
    </div>
  );
}