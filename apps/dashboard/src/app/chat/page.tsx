'use client';

import { useState } from 'react';
import ChatWindow, { OrderContext } from '@/components/chat/ChatWindow';

type Step = 'email' | 'otp' | 'chat';

const TENANT_ID = 'tenant_demo';

export default function ChatPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const [availableOrders, setAvailableOrders] = useState<OrderContext[]>([]);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    await fetch('/api/chat/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setSending(false);

    // In mock mode, log tells you the code — show hint in UI
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEV] Check NestJS logs for OTP code');
    }

    setStep('otp');
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setOtpError('');
    setVerifying(true);

    const verifyRes = await fetch('/api/chat/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code: otpInput }),
    });
    const { valid } = await verifyRes.json() as { valid: boolean };

    if (!valid) {
      setOtpError('Invalid or expired code. Try again.');
      setVerifying(false);
      return;
    }

    // Fetch orders by email + start conversation in parallel
    const [ordersRes, startRes] = await Promise.all([
      fetch('/api/chat/orders-by-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: TENANT_ID, email }),
      }),
      fetch('/api/chat/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: TENANT_ID, customerId: email }),
      }),
    ]);

    const orders = await ordersRes.json() as OrderContext[];
    const { conversationId: cid } = await startRes.json() as { conversationId: string };

    setAvailableOrders(orders);
    setConversationId(cid);
    setVerifying(false);
    setStep('chat');
  }

  function handleStartOver() {
    setStep('email');
    setEmail('');
    setOtpInput('');
    setOtpError('');
    setConversationId('');
    setAvailableOrders([]);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-[#6ee7b7] animate-pulse" />
            <span className="text-xs font-mono text-[#6ee7b7] tracking-widest uppercase">ResolveIQ</span>
          </div>
          <h1 className="text-white font-semibold text-lg">Returns & Refunds</h1>
          <p className="text-white/40 text-sm mt-1">Resolved in under 2 minutes.</p>
        </div>

        {/* Panel */}
        <div
          className="rounded-2xl border border-white/10 bg-[#12121a] overflow-hidden"
          style={{ minHeight: step === 'chat' ? '520px' : 'auto' }}
        >

          {/* Step 1 — Email */}
          {step === 'email' && (
            <div className="p-6">
              <p className="text-white/60 text-sm mb-4">Enter the email address you used for your order.</p>
              <form onSubmit={handleSendOtp} className="flex flex-col gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#6ee7b7]/40"
                />
                <button
                  type="submit"
                  disabled={!email || sending}
                  className="rounded-xl bg-[#6ee7b7] text-[#0a0a0f] text-sm font-semibold py-3 hover:bg-[#5dd4a4] disabled:opacity-40 transition-colors"
                >
                  {sending ? 'Sending…' : 'Send Verification Code'}
                </button>
              </form>
            </div>
          )}

          {/* Step 2 — OTP */}
          {step === 'otp' && (
            <div className="p-6">
              <p className="text-white/60 text-sm mb-1">
                We sent a 6-digit code to
              </p>
              <p className="text-white text-sm font-medium mb-4">{email}</p>
              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
                <input
                  type="text"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  maxLength={6}
                  className="bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white text-sm text-center tracking-[0.5em] placeholder-white/20 focus:outline-none focus:border-[#6ee7b7]/40"
                />
                {otpError && <p className="text-red-400 text-xs">{otpError}</p>}
                <button
                  type="submit"
                  disabled={otpInput.length !== 6 || verifying}
                  className="rounded-xl bg-[#6ee7b7] text-[#0a0a0f] text-sm font-semibold py-3 hover:bg-[#5dd4a4] disabled:opacity-40 transition-colors"
                >
                  {verifying ? 'Verifying…' : 'Verify & Continue'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="text-white/30 text-xs hover:text-white/50 transition-colors"
                >
                  ← Use a different email
                </button>
              </form>
            </div>
          )}

          {/* Step 3 — Chat */}
          {step === 'chat' && conversationId && (
            <div style={{ height: '520px' }}>
              <ChatWindow
                conversationId={conversationId}
                customerEmail={email}
                tenantId={TENANT_ID}
                customerId={email}
                availableOrders={availableOrders}
                onStartOver={handleStartOver}
              />
            </div>
          )}
        </div>

        <p className="text-center text-white/20 text-xs mt-4">Powered by ResolveIQ · AI-assisted support</p>
      </div>
    </div>
  );
}