'use client';

import { useState } from 'react';
import ChatWindow, { OrderContext } from '@/components/chat/ChatWindow';

type Step = 'email' | 'otp' | 'chat';

// ── Fix: was 'tenant_demo' — must match seeded tenant ID ──────────────────
const TENANT_ID = 'tenant_shopease';

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
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        fontFamily: 'var(--font-body)',
      }}
    >
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span
              style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: 'var(--acid)',
                display: 'inline-block',
                animation: 'pulse-glow 2s infinite',
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--acid)',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
              }}
            >
              ZeroDesk
            </span>
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--text-1)',
              margin: '0 0 4px',
            }}
          >
            Returns & Support
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>
            AI-assisted resolution
          </p>
        </div>

        {/* Panel */}
        <div
          className="card"
          style={{
            borderRadius: '20px',
            overflow: 'hidden',
            minHeight: step === 'chat' ? '520px' : 'auto',
          }}
        >

          {/* Step 1 — Email */}
          {step === 'email' && (
            <div style={{ padding: '24px' }}>
              <p style={{ color: 'var(--text-2)', fontSize: '14px', marginBottom: '16px' }}>
                Enter the email address you used for your order.
              </p>
              <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="input"
                />
                <button
                  type="submit"
                  disabled={!email || sending}
                  className="btn btn-primary"
                  style={{ justifyContent: 'center', padding: '13px', width: '100%', opacity: sending ? 0.6 : 1 }}
                >
                  {sending ? 'Sending…' : 'Send Verification Code →'}
                </button>
              </form>
            </div>
          )}

          {/* Step 2 — OTP */}
          {step === 'otp' && (
            <div style={{ padding: '24px' }}>
              <p style={{ color: 'var(--text-2)', fontSize: '14px', marginBottom: '4px' }}>
                We sent a 6-digit code to
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  color: 'var(--acid)',
                  marginBottom: '20px',
                }}
              >
                {email}
              </p>
              <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="text"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  maxLength={6}
                  className="input"
                  style={{ textAlign: 'center', letterSpacing: '0.5em', fontSize: '20px' }}
                />
                {otpError && (
                  <p
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      color: 'var(--red)',
                      padding: '8px 12px',
                      background: 'rgba(255,92,92,0.08)',
                      border: '1px solid rgba(255,92,92,0.25)',
                      borderRadius: '8px',
                    }}
                  >
                    ⚠ {otpError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={otpInput.length !== 6 || verifying}
                  className="btn btn-primary"
                  style={{ justifyContent: 'center', padding: '13px', width: '100%', opacity: verifying ? 0.6 : 1 }}
                >
                  {verifying ? 'Verifying…' : 'Verify & Continue →'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-mono)', fontSize: '11px',
                    color: 'var(--text-3)', padding: '4px',
                  }}
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

        <p
          style={{
            textAlign: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--text-3)',
            marginTop: '16px',
          }}
        >
          Powered by ZeroDesk · AI-assisted support
        </p>
      </div>
    </div>
  );
}