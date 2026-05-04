'use client';

import { useState, useRef, useEffect } from 'react';

const WIDGET_URL = '/widget';

export default function FloatingWidget() {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  function toggle() {
    if (!open) {
      if (!loaded) setLoaded(true);
      setOpen(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      setTimeout(() => setOpen(false), 220);
    }
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && open) toggle(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      {/* iframe panel */}
      {open && (
        <div
          ref={frameRef}
          style={{
            position: 'fixed',
            bottom: '100px',
            right: '28px',
            width: '380px',
            height: '580px',
            borderRadius: '20px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            zIndex: 9998,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.97)',
            transition: 'opacity 0.22s ease, transform 0.22s ease',
          }}
        >
          {loaded && (
            <iframe
              src={WIDGET_URL}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="ResolveIQ Support"
              allow="clipboard-write"
            />
          )}
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={toggle}
        aria-label="Open support chat"
        style={{
          position: 'fixed',
          bottom: '28px',
          right: '28px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: '#0a0a0f',
          border: '2px solid #6ee7b7',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 24px rgba(110,231,183,0.3)',
          zIndex: 9999,
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 32px rgba(110,231,183,0.45)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 24px rgba(110,231,183,0.3)';
        }}
      >
        {/* Pulse dot — hidden when open */}
        {!open && (
          <span style={{
            position: 'absolute',
            top: '2px', right: '2px',
            width: '12px', height: '12px',
            background: '#6ee7b7',
            borderRadius: '50%',
            border: '2px solid #0a0a0f',
            animation: 'riq-pulse 2s infinite',
          }} />
        )}

        {/* Icon toggles between chat and X */}
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="#6ee7b7" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
            stroke="#6ee7b7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      {/* Pulse keyframe injected once */}
      <style>{`
        @keyframes riq-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        @media (max-width: 480px) {
          /* full screen on mobile — handled by widget page itself */
        }
      `}</style>
    </>
  );
}