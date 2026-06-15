import React, { useEffect, useState } from 'react';

export default function RoomModal({ open, onClose, onCreateRoom }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('public');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setSubmitting(false);
    setName('');
    setType('public');
  }, [open]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await onCreateRoom({ name: trimmed, type });
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to create room');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        role="button"
        tabIndex={0}
      />

      <div className="relative w-full max-w-md glass rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-bold">Create room</div>
            <div className="text-sm text-slate-300/90 mt-1">
              Public rooms are discoverable. Private rooms require invite codes.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-1.5 border border-white/10 hover:bg-white/5 transition"
          >
            ✕
          </button>
        </div>

        <form className="mt-4 space-y-3" onSubmit={submit}>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Room name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              className="mt-2 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-emerald-400/60"
              placeholder="e.g., General"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Room type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-2 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-emerald-400/60 text-white"
            >
              <option value="public" className="bg-[#0f172a] text-white">Public</option>
              <option value="private" className="bg-[#0f172a] text-white">Private (invite code)</option>
              <option value="chatbot" className="bg-[#0f172a] text-white">🤖 AI Chatbot (interactive)</option>
            </select>
          </div>

          {error ? <div className="text-sm text-rose-400">{error}</div> : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold hover:bg-emerald-400 transition disabled:opacity-60"
          >
            {submitting ? 'Creating…' : 'Create'}
          </button>
        </form>
      </div>
    </div>
  );
}

