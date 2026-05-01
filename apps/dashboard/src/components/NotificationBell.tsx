// apps/dashboard/src/components/NotificationBell.tsx
// Drop this into wherever P1 exposes the Navbar slot.

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string | null;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/unread');
      if (!res.ok) return;
      const data = (await res.json()) as {
        count: number;
        items: NotificationItem[];
      };
      setCount(data.count);
      setItems(data.items.slice(0, 5));
    } catch {
      // silently ignore
    }
  }, []);

  // Initial fetch + 30-second polling
  useEffect(() => {
    void fetchUnread();
    const id = setInterval(fetchUnread, 30_000);
    return () => clearInterval(id);
  }, [fetchUnread]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function markAllRead() {
    await fetch('/api/notifications/mark-all-read', { method: 'POST' });
    setCount(0);
    setItems([]);
    setOpen(false);
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/mark-read/${id}`, { method: 'POST' });
    setItems((prev) => prev.filter((n) => n.id !== id));
    setCount((c) => Math.max(0, c - 1));
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
        aria-label="Notifications"
      >
        <svg
          className="h-5 w-5 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl border border-white/10 bg-[#12121a] shadow-2xl shadow-black/60 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <span className="text-sm font-semibold text-white">
              Notifications
            </span>
            {count > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Items */}
          {items.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-600">
              You're all caught up ✓
            </div>
          ) : (
            <ul>
              {items.map((n) => (
                <li
                  key={n.id}
                  className="border-b border-white/5 last:border-0"
                >
                  <div className="flex items-start gap-3 px-4 py-3 hover:bg-white/3 transition-colors">
                    <div className="mt-1 h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      {n.actionUrl ? (
                        <a
                          href={n.actionUrl}
                          className="block text-sm font-medium text-white hover:text-emerald-400 transition-colors truncate"
                          onClick={() => markRead(n.id)}
                        >
                          {n.title}
                        </a>
                      ) : (
                        <p className="text-sm font-medium text-white truncate">
                          {n.title}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mt-0.5">
                        {n.message}
                      </p>
                      <p className="text-xs text-gray-700 mt-1">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => markRead(n.id)}
                      className="text-gray-700 hover:text-gray-400 shrink-0 mt-0.5"
                      title="Dismiss"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}