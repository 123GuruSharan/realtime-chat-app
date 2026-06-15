import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, getToken, setToken } from './api';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import RoomModal from './components/RoomModal';

function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      if (mode === 'register') {
        const data = await api.register({ email, password, username });
        setToken(data.token);
        onAuthed(data.user);
      } else {
        const data = await api.login({ email, password });
        setToken(data.token);
        onAuthed(data.user);
      }
    } catch (ex) {
      setErr(ex.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass w-full max-w-md rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Chat App</h1>
            <div className="text-sm text-slate-300/90 mt-1">Secure, real-time rooms with Socket.IO.</div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className={`flex-1 rounded-xl px-3 py-2 border transition ${
              mode === 'login'
                ? 'bg-emerald-500/15 border-emerald-300/25 text-emerald-300'
                : 'bg-white/5 border-white/10 text-slate-200/90 hover:bg-white/8'
            }`}
            onClick={() => setMode('login')}
          >
            Login
          </button>
          <button
            type="button"
            className={`flex-1 rounded-xl px-3 py-2 border transition ${
              mode === 'register'
                ? 'bg-emerald-500/15 border-emerald-300/25 text-emerald-300'
                : 'bg-white/5 border-white/10 text-slate-200/90 hover:bg-white/8'
            }`}
            onClick={() => setMode('register')}
          >
            Register
          </button>
        </div>

        <form className="mt-4 space-y-3" onSubmit={submit}>
          {mode === 'register' ? (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Display name</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="mt-2 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-emerald-400/60"
                placeholder="Your name"
              />
            </div>
          ) : null}

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-2 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-emerald-400/60"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="mt-2 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-emerald-400/60"
              placeholder="Min 8 characters"
            />
          </div>

          {err ? <div className="text-sm text-rose-400">{err}</div> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold hover:bg-emerald-400 transition disabled:opacity-60"
          >
            {loading ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [publicRooms, setPublicRooms] = useState([]);
  const [myRooms, setMyRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const loadRooms = useCallback(async () => {
    const [pub, mine] = await Promise.all([api.publicRooms(), api.myRooms()]);
    setPublicRooms(pub.rooms || []);
    setMyRooms(mine.rooms || []);
  }, []);

  useEffect(() => {
    const t = getToken();
    if (!t) return;
    api
      .me()
      .then((d) => setUser(d.user))
      .catch(() => setToken(null));
  }, []);

  useEffect(() => {
    if (!user) return;
    loadRooms().catch(() => {});
  }, [user, loadRooms]);

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code || !user) return;
    (async () => {
      const v = await api.validateInvite(code);
      if (!v.valid) throw new Error(v.error || 'Invalid invite');
      await api.joinRoom({ roomId: v.roomId, inviteCode: code });
      const mine = await api.myRooms();
      const room = (mine.rooms || []).find((r) => r.roomId === v.roomId);
      setActiveRoom({
        id: v.roomId,
        name: v.name,
        inviteCode: room?.inviteCode,
      });
      await loadRooms();
    })().catch((e) => {
      console.error(e);
      alert(e?.message || 'Could not join using invite code');
    });
  }, [searchParams, user, loadRooms]);

  async function handleAuthed(u) {
    setUser(u);
    await loadRooms();
  }

  function logout() {
    setToken(null);
    setUser(null);
    setActiveRoom(null);
  }

  const selectedRoomMeta = useMemo(() => {
    if (!activeRoom) return null;
    return activeRoom;
  }, [activeRoom]);

  async function createRoom({ name, type }) {
    const { room } = await api.createRoom({ name, type });
    setActiveRoom({
      id: room.roomId,
      name: room.name,
      inviteCode: room.inviteCode,
      type: room.type,
    });
    await loadRooms();
  }

  async function selectRoom(r) {
    // r may be from public list or myRooms.
    if (r.type === 'public' || r.type === undefined) {
      await api.joinRoom({ roomId: r.roomId });
      await loadRooms();
      setActiveRoom({ id: r.roomId, name: r.name });
      return;
    }
    setActiveRoom({ id: r.roomId, name: r.name, inviteCode: r.inviteCode, type: r.type });
  }

  async function joinViaCode(code) {
    const v = await api.validateInvite(code);
    if (!v.valid) throw new Error(v.error || 'Invalid invite code');
    await api.joinRoom({ roomId: v.roomId, inviteCode: code });
    const mine = await api.myRooms();
    const room = (mine.rooms || []).find((rr) => rr.roomId === v.roomId);
    setActiveRoom({ id: v.roomId, name: v.name, inviteCode: room?.inviteCode, type: 'private' });
    await loadRooms();
  }

  if (!user) return <AuthScreen onAuthed={handleAuthed} />;

  return (
    <div className="min-h-screen max-w-[1300px] mx-auto px-3 py-4 flex flex-col lg:flex-row gap-3">
      <div className="lg:block">
        <Sidebar
          publicRooms={publicRooms}
          myRooms={myRooms}
          onSelectRoom={selectRoom}
          onCreateRoomClick={() => setCreateOpen(true)}
          onJoinViaCode={joinViaCode}
        />
      </div>

      <main className="flex-1 min-w-0 overflow-hidden">
        <div className="h-full">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-[#020617] font-semibold border border-white/10">
                {(user.username && user.username[0] ? user.username[0].toUpperCase() : '?')}
              </div>
              <div>
                <div className="text-sm text-slate-200 font-semibold">Signed in as {user.username}</div>
                <div className="text-xs text-slate-400">Invite-only private rooms supported</div>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="rounded-xl px-3 py-2 border border-white/10 hover:bg-white/5 transition text-sm text-slate-200"
            >
              Log out
            </button>
          </div>

          {selectedRoomMeta ? (
            <ChatWindow
              roomId={selectedRoomMeta.id}
              roomName={selectedRoomMeta.name}
              inviteCode={selectedRoomMeta.inviteCode}
              user={user}
            />
          ) : (
            <div className="glass rounded-2xl p-6 h-[calc(100vh-150px)] flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="text-lg font-bold">Pick a room</div>
                <div className="text-sm text-slate-300/90 mt-2 leading-relaxed">
                  Select a public room from the left, or join a private one with an invite code.
                </div>
                <div className="mt-4 text-xs text-slate-400">
                  Tip: Private room admins see an invite code in the chat header with a Copy button.
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <RoomModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreateRoom={createRoom}
      />
    </div>
  );
}

