'use client';

import { useState } from 'react';

interface Props {
  reportId: string;
  token: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function ActionPanel({ reportId, token, onSuccess, onClose }: Props) {
  const [note, setNote] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!note.trim() || !actionTaken.trim()) {
      setError('Both fields are required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:3000/api/workflow/action/${reportId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ note, actionTaken }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? 'Request failed');
      }
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-[#12121a] border border-slate-700/60 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[#6ee7b7] font-semibold text-lg mb-4">Take Action</h2>
        <label className="block text-xs text-slate-500 mb-1 uppercase tracking-wider">
          Resolution Note
        </label>
        <textarea
          className="w-full bg-[#0a0a0f] border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#6ee7b7]/50 mb-3 resize-none"
          rows={3}
          placeholder="Describe what was done…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <label className="block text-xs text-slate-500 mb-1 uppercase tracking-wider">
          Action Taken
        </label>
        <input
          className="w-full bg-[#0a0a0f] border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#6ee7b7]/50 mb-4"
          placeholder="e.g. Refund processed, Account updated…"
          value={actionTaken}
          onChange={(e) => setActionTaken(e.target.value)}
        />

        {error && (
          <p className="text-red-400 text-xs mb-3 bg-red-900/20 border border-red-800/40 rounded px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="px-5 py-2 bg-[#6ee7b7] text-[#0a0a0f] font-semibold text-sm rounded-lg hover:bg-[#4dd9a4] transition-colors disabled:opacity-50"
          >
            {loading ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}