import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { api, getToken } from '../api';
import MessageBubble from './MessageBubble';

function formatTime(date = new Date()) {
  let h = date.getHours();
  const m = date.getMinutes();
  const am = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const mm = m < 10 ? `0${m}` : m;
  return `${h}:${mm} ${am}`;
}

function getDisplayDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  }
}

function normalizeOnline(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.usernames)) return payload.usernames;
  return [];
}

export default function ChatWindow({ roomId, roomName, inviteCode, user }) {
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingName, setTypingName] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const socketRef = useRef(null);
  const typingStopTimerRef = useRef(null);
  const messagesEndRef = useRef(null);

  const token = getToken();

  const append = useCallback((msg) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const loadFirstPage = useCallback(async (rid) => {
    const data = await api.getMessages(rid, 1, 50);
    const mapped = (data.messages || []).map((m) => ({
      kind: 'chat',
      id: m.id,
      username: m.username,
      message: m.message,
      time: m.time,
      userId: m.userId || '',
      createdAt: m.createdAt,
    }));
    setMessages(mapped);
  }, []);

  useEffect(() => {
    if (!roomId || !token) return undefined;

    setLoading(true);
    setMessages([]);
    setOnlineUsers([]);
    setTypingName('');
    setInput('');
    setCopied(false);

    const socket = io({
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('joinRoom', { roomId }, async (ack) => {
        if (!ack || !ack.ok) {
          append({ kind: 'sys', text: ack?.error || 'Join denied' });
          setLoading(false);
          return;
        }
        try {
          await loadFirstPage(roomId);
        } catch (e) {
          console.error(e);
          append({ kind: 'sys', text: 'Failed to load messages' });
        } finally {
          setLoading(false);
        }
      });
    });

    socket.on('chat-message', (data) => {
      append({
        kind: 'chat',
        username: data.username,
        message: data.message,
        time: data.time,
        userId: data.userId ? String(data.userId) : '',
        createdAt: data.createdAt || new Date().toISOString(),
      });
    });

    socket.on('online-users', (payload) => setOnlineUsers(normalizeOnline(payload)));

    socket.on('user-joined', (d) => {
      append({ kind: 'sys', text: d.message || `${d.username} joined the room` });
    });

    socket.on('user-left', (d) => {
      append({ kind: 'sys', text: d.message || `${d.username} left the room` });
    });

    socket.on('typing', (d) => {
      if (d.username === user.username) return;
      setTypingName(d.username || '');
    });

    socket.on('stop-typing', (d) => {
      if (d.username === user.username) return;
      setTypingName('');
    });

    socket.on('join-error', (d) => {
      append({ kind: 'sys', text: d.message || 'Could not join room' });
    });

    socket.on('connect_error', (err) => {
      append({ kind: 'sys', text: err.message || 'Socket connection failed' });
    });

    return () => {
      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = null;
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, token, user.username, append, loadFirstPage]);

  useEffect(() => {
    if (!messagesEndRef.current) return;
    messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  useEffect(() => {
    // Cleanup timer on unmount safety.
    return () => {
      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    };
  }, []);

  function onChangeMessage(e) {
    const v = e.target.value;
    setInput(v);
    const s = socketRef.current;
    if (!s || !roomId) return;

    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    s.emit('typing', { roomId });

    typingStopTimerRef.current = setTimeout(() => {
      s.emit('stop-typing', { roomId });
      typingStopTimerRef.current = null;
    }, 800);
  }

  function stopTyping() {
    const s = socketRef.current;
    if (!s || !roomId) return;
    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    typingStopTimerRef.current = null;
    s.emit('stop-typing', { roomId });
  }

  function sendMessage(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || !socketRef.current) return;
    socketRef.current.emit('chat-message', {
      roomId,
      message: text,
      time: formatTime(new Date()),
    });
    setInput('');
    stopTyping();
  }

  async function copyInvite() {
    if (!inviteCode) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteCode);
      } else {
        const ta = document.createElement('textarea');
        ta.value = inviteCode;
        ta.setAttribute('readonly', '');
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (e) {
      alert('Failed to copy invite code');
    }
  }

  const rendered = useMemo(() => {
    let lastUser = null;
    let lastDateStr = null;
    const items = [];

    messages.forEach((m, i) => {
      const dateStr = m.createdAt ? new Date(m.createdAt).toDateString() : '';

      // If the date changed, insert a date-divider
      if (dateStr && dateStr !== lastDateStr) {
        items.push({
          kind: 'date-divider',
          text: getDisplayDate(m.createdAt),
          key: `d-${dateStr}-${i}`,
        });
        lastDateStr = dateStr;
        lastUser = null; // reset grouping across dates
      }

      if (m.kind === 'sys') {
        lastUser = null;
        items.push({ ...m, grouped: false, own: false, key: `s-${m.text}-${i}` });
      } else {
        const grouped = lastUser === m.username;
        lastUser = m.username;
        const own = String(m.userId) === String(user.id);
        items.push({ ...m, grouped, own, key: m.id ? `m-${m.id}` : `m-${i}` });
      }
    });

    return items;
  }, [messages, user.id]);

  return (
    <div className="flex-1 min-w-0 flex flex-col lg:flex-row">
      {/* Main chat */}
      <section className="flex-1 min-w-0 flex flex-col bg-transparent">
        <header className="glass px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="text-[15px] font-bold tracking-wide">Chat App</div>
            <div className="hidden sm:block h-5 w-px bg-white/10" />
            <div className="truncate">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-300/20 text-emerald-300 text-xs font-semibold">
                {roomName}
              </span>
            </div>
          </div>

          {inviteCode ? (
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Invite</span>
                <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-mono text-cyan-200">
                  {inviteCode}
                </span>
              </div>
              <button
                type="button"
                onClick={copyInvite}
                className="rounded-xl bg-emerald-500/15 border border-emerald-300/25 hover:bg-emerald-500/25 transition px-3 py-2 text-sm font-semibold"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          ) : null}
        </header>

        <div className="flex-1 min-h-0 bg-transparent">
          <div className="h-full overflow-y-auto scrollbar-thin px-4 py-4">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-10 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
                ))}
              </div>
            ) : null}

            {!loading
              ? rendered.map((m) => {
                  if (m.kind === 'date-divider') {
                    return (
                      <div key={m.key} className="flex items-center justify-center my-4">
                        <div className="h-px bg-white/5 flex-1" />
                        <span className="mx-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                          {m.text}
                        </span>
                        <div className="h-px bg-white/5 flex-1" />
                      </div>
                    );
                  }
                  return m.kind === 'sys' ? (
                    <MessageBubble key={m.key} message={m} own={false} grouped={false} />
                  ) : (
                    <MessageBubble key={m.key} message={m} own={m.own} grouped={m.grouped} />
                  );
                })
              : null}

            <div ref={messagesEndRef} />
          </div>

          <div className="px-4 pb-2">
            {typingName ? (
              <div className="text-sm text-slate-300/90 flex items-center gap-2">
                <span className="font-semibold text-slate-200">{typingName}</span>
                <span>is typing</span>
                <span className="flex items-center gap-1">
                  <span className="typing-dot" style={{ animationDelay: '0ms' }} />
                  <span className="typing-dot" style={{ animationDelay: '150ms' }} />
                  <span className="typing-dot" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <form onSubmit={sendMessage} className="glass px-4 py-3 flex gap-3">
          <input
            value={input}
            onChange={onChangeMessage}
            onBlur={stopTyping}
            placeholder="Message…"
            className="flex-1 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-emerald-400/60"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold hover:bg-emerald-400 transition disabled:opacity-50 disabled:hover:bg-emerald-500"
          >
            Send
          </button>
        </form>
      </section>

      {/* Online users panel (optional right panel) */}
      <aside className="hidden lg:block w-[220px] min-w-[220px] glass border-l-0 border-t-0">
        <div className="px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Online
          </div>
          <div className="space-y-2 overflow-y-auto h-[calc(100vh-170px)] scrollbar-thin pr-1">
            {(onlineUsers || []).map((name) => {
              const letter = (name && name[0] ? name[0].toUpperCase() : '?');
              return (
                <div
                  key={name}
                  className="flex items-center gap-3 px-2 py-2 rounded-2xl hover:bg-white/5 transition border border-transparent hover:border-white/10"
                >
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-sm font-semibold text-[#020617] border border-white/10">
                      {letter}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div className="text-sm text-white/90 truncate">{name}</div>
                </div>
              );
            })}
            {!onlineUsers?.length ? (
              <div className="text-xs text-slate-500 px-2">No one online.</div>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}

