const TOKEN_KEY = 'chat_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || res.statusText);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),

  createRoom: (body) => request('/create-room', { method: 'POST', body: JSON.stringify(body) }),
  joinRoom: (body) => request('/join-room', { method: 'POST', body: JSON.stringify(body) }),

  publicRooms: () => request('/rooms'),
  myRooms: () => request('/my-rooms'),

  getMessages: (roomId, page = 1, limit = 50) =>
    request(`/messages?roomId=${encodeURIComponent(roomId)}&page=${page}&limit=${limit}`),

  validateInvite: (code) =>
    request('/validate-invite', { method: 'POST', body: JSON.stringify({ code }) }),

  regenerateInvite: (roomId) =>
    request(`/rooms/${roomId}/regenerate-invite`, { method: 'POST', body: '{}' }),
};

