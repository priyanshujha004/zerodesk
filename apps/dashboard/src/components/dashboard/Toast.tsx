'use client';

import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error';

export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

interface Props {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}

export function Toast({ toasts, onDismiss }: Props) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: number) => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl text-sm font-medium transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      } ${
        toast.type === 'success'
          ? 'bg-[#12121a] border-[#6ee7b7]/30 text-[#6ee7b7]'
          : 'bg-[#12121a] border-red-500/30 text-red-400'
      }`}
    >
      <span>{toast.type === 'success' ? '✓' : '✕'}</span>
      <span>{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="ml-2 text-slate-600 hover:text-slate-400 transition-colors"
      >
        ×
      </button>
    </div>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

let _id = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  function push(message: string, type: ToastType = 'success') {
    const id = ++_id;
    setToasts((prev) => [...prev, { id, message, type }]);
  }

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return { toasts, push, dismiss };
}