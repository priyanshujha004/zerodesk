'use client';

import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error';
export interface ToastMessage { id: number; message: string; type: ToastType; }

export function Toast({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: number) => void }) {
  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 500, display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {toasts.map(t => <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />)}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: number) => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); setTimeout(() => onDismiss(toast.id), 300); }, 3500);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 14px', borderRadius: '7px',
      background: '#111111', border: `1px solid ${toast.type === 'success' ? '#262626' : 'rgba(248,113,113,0.25)'}`,
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      fontSize: '13px', fontFamily: 'Inter, sans-serif',
      color: toast.type === 'success' ? '#a3a3a3' : '#f87171',
      transition: 'opacity 0.3s, transform 0.3s',
      opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(8px)',
      minWidth: '220px',
    }}>
      <span style={{ color: toast.type === 'success' ? '#34d399' : '#f87171', fontWeight: 600 }}>
        {toast.type === 'success' ? '✓' : '✕'}
      </span>
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button onClick={() => onDismiss(toast.id)} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: '#333333', fontSize: '14px', padding: '0 2px',
        lineHeight: 1,
      }}>×</button>
    </div>
  );
}

let _id = 0;
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  function push(message: string, type: ToastType = 'success') {
    const id = ++_id;
    setToasts(prev => [...prev, { id, message, type }]);
  }
  function dismiss(id: number) { setToasts(prev => prev.filter(t => t.id !== id)); }
  return { toasts, push, dismiss };
}