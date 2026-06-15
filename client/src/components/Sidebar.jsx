import React, { useMemo, useState } from 'react';

export default function Sidebar({
  publicRooms,
  myRooms,
  onSelectRoom,
  onCreateRoomClick,
  onJoinViaCode,
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  const hasAnyRooms = useMemo(
    () => (publicRooms?.length || 0) + (myRooms?.length || 0) > 0,
    [publicRooms, myRooms]
  );

  async function submit(e) {
    e.preventDefault();
    const v = code.trim();
    if (!v) return;
    setError('');
    setJoining(true);
    try {
      await onJoinViaCode(v);
      setCode('');
    } catch (err) {
      setError(err?.message || 'Failed to join');
    } finally {
      setJoining(false);
    }
  }

  return (
    <aside className="glass md:w-[220px] w-full md:min-w-[220px] md:max-h-[calc(100vh-0px)] overflow-y-auto">
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Rooms</div>
          </div>
          <button
            type="button"
            onClick={onCreateRoomClick}
            className="rounded-xl bg-emerald-500/15 text-emerald-400 px-3 py-1.5 border border-white/10 hover:bg-emerald-500/25 transition"
          >
            + Create
          </button>
        </div>

        <div className="mt-3 space-y-4">
          <section>
            <div className="text-sm font-semibold text-slate-200 mb-2">Public</div>
            <div className="space-y-1">
              {(publicRooms || []).map((r) => (
                <button
                  key={r.roomId}
                  type="button"
                  onClick={() => onSelectRoom(r)}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 transition border border-transparent hover:border-white/10"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-white/90">{r.name}</span>
                    <span className="text-[11px] text-slate-500">Public</span>
                  </div>
                </button>
              ))}
              {!publicRooms?.length && <div className="text-xs text-slate-500">No public rooms yet.</div>}
            </div>
          </section>

          <section>
            <div className="text-sm font-semibold text-slate-200 mb-2">My rooms</div>
            <div className="space-y-1">
              {(myRooms || []).map((r) => (
                <button
                  key={r.roomId}
                  type="button"
                  onClick={() => onSelectRoom(r)}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 transition border border-transparent hover:border-white/10"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-white/90 flex items-center gap-2">
                      {r.type === 'private' ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                          🔒
                        </span>
                      ) : r.type === 'chatbot' ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          🤖
                        </span>
                      ) : null}
                      {r.name}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {r.type === 'private' ? 'Private' : r.type === 'chatbot' ? 'Chatbot' : 'Public'}
                    </span>
                  </div>
                </button>
              ))}
              {!myRooms?.length && <div className="text-xs text-slate-500">No rooms yet.</div>}
            </div>
          </section>

          <section>
            <div className="text-sm font-semibold text-slate-200 mb-2">Join via code</div>
            <form onSubmit={submit} className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Invite code"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-emerald-400/60"
                />
                <button
                  type="submit"
                  disabled={joining}
                  className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold hover:bg-emerald-400 transition disabled:opacity-50"
                >
                  {joining ? 'Joining…' : 'Join'}
                </button>
              </div>
              {error ? <div className="text-xs text-rose-400">{error}</div> : null}
            </form>
          </section>

          {!hasAnyRooms ? (
            <div className="text-xs text-slate-500 leading-relaxed pt-1">
              Create a room or join using an invite code to start chatting.
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

