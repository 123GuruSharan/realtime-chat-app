const socket = io();

let currentUsername = '';
let currentRoom = '';
let lastMessageUsername = '';

const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username-input');
const roomInput = document.getElementById('room-input');
const roomSelect = document.getElementById('room-select');
const currentRoomName = document.getElementById('current-room-name');
const onlineUsersList = document.getElementById('online-users-list');
const messagesContainer = document.getElementById('messages-container');
const messagesDiv = document.getElementById('messages');
const typingIndicator = document.getElementById('typing-indicator');
const typingNameEl = typingIndicator ? typingIndicator.querySelector('.typing-name') : null;
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');

let typingTimeout = null;

function setActiveRoomInSidebar(room) {
  document.querySelectorAll('.room-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.room === room);
  });
}

document.querySelectorAll('.room-item').forEach((el) => {
  el.addEventListener('click', () => {
    const room = el.dataset.room;
    if (!room || room === currentRoom) return;
    currentRoom = room;
    currentRoomName.textContent = room;
    chatScreen.dataset.currentRoom = room;
    setActiveRoomInSidebar(room);
    messagesDiv.innerHTML = '';
    lastMessageUsername = '';
    socket.emit('join-room', { username: currentUsername, room });
    messageInput.focus();
  });
});

roomSelect.addEventListener('change', () => {
  const value = roomSelect.value;
  if (value) roomInput.value = value;
});

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = usernameInput.value.trim();
  const room = roomInput.value.trim() || roomSelect.value.trim();
  if (!username) {
    alert('Please enter your username.');
    return;
  }
  if (!room) {
    alert('Please enter or select a room name.');
    return;
  }

  currentUsername = username;
  currentRoom = room;
  currentRoomName.textContent = room;
  chatScreen.dataset.currentRoom = room;
  lastMessageUsername = '';

  socket.emit('join-room', { username, room });

  loginScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
  messagesDiv.innerHTML = '';
  setActiveRoomInSidebar(room);
  messageInput.focus();
});

socket.on('join-error', (data) => {
  alert(data.message || 'Could not join room.');
});

function formatTime(date) {
  const d = date instanceof Date ? date : new Date();
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const mins = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${mins} ${ampm}`;
}

function escapeHtml(text) {
  if (text == null) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getInitial(name) {
  if (!name || typeof name !== 'string') return '?';
  return name.trim().charAt(0).toUpperCase();
}

function appendMessage(data, isOwn, isGrouped) {
  const row = document.createElement('div');
  row.className = 'message-row' + (isOwn ? ' own' : '') + (isGrouped ? ' message-grouped' : '');
  row.dataset.username = data.username;

  const avatarLetter = escapeHtml(getInitial(data.username));
  row.innerHTML =
    '<div class="message-avatar-wrap">' +
    '<div class="message-avatar">' + avatarLetter + '</div>' +
    '</div>' +
    '<div class="message-content">' +
    '<div class="message">' +
    '<div class="message-header">' +
    '<span class="message-username">' + escapeHtml(data.username) + '</span>' +
    '<span class="message-time">' + escapeHtml(data.time) + '</span>' +
    '</div>' +
    '<div class="message-body">' + escapeHtml(data.message) + '</div>' +
    '</div>' +
    '</div>';
  messagesDiv.appendChild(row);
  scrollToBottom();
}

function appendSystemMessage(text) {
  const div = document.createElement('div');
  div.className = 'system-message';
  div.textContent = text;
  div.style.alignSelf = 'center';
  messagesDiv.appendChild(div);
  scrollToBottom();
}

function scrollToBottom() {
  if (!messagesContainer) return;
  messagesContainer.scrollTo({ top: messagesContainer.scrollHeight, behavior: 'smooth' });
}

socket.on('previous-messages', (messages) => {
  lastMessageUsername = '';
  (messages || []).forEach((msg) => {
    const isOwn = msg.username === currentUsername;
    const isGrouped = lastMessageUsername === msg.username;
    appendMessage(
      { username: msg.username, message: msg.message, time: msg.time },
      isOwn,
      isGrouped
    );
    lastMessageUsername = msg.username;
  });
});

socket.on('chat-message', (data) => {
  const isOwn = data.username === currentUsername;
  const isGrouped = lastMessageUsername === data.username;
  appendMessage(data, isOwn, isGrouped);
  lastMessageUsername = data.username;
});

socket.on('online-users', (users) => {
  onlineUsersList.innerHTML = '';
  (users || []).forEach((name) => {
    const li = document.createElement('li');
    const initial = escapeHtml(getInitial(name));
    li.innerHTML =
      '<span class="user-avatar-wrap">' +
      '<span class="user-avatar">' + initial + '</span>' +
      '<span class="user-status"></span>' +
      '</span>' +
      '<span class="user-name">' + escapeHtml(name) + '</span>';
    onlineUsersList.appendChild(li);
  });
});

socket.on('user-joined', (data) => {
  appendSystemMessage(data.message || data.username + ' joined the room');
});

socket.on('user-left', (data) => {
  appendSystemMessage(data.message || data.username + ' left the room');
});

socket.on('typing', (data) => {
  if (data.username === currentUsername) return;
  if (typingNameEl) typingNameEl.textContent = escapeHtml(data.username) + ' is typing ';
  typingIndicator.classList.remove('hidden');
});

socket.on('stop-typing', (data) => {
  if (data.username === currentUsername) return;
  typingIndicator.classList.add('hidden');
  if (typingNameEl) typingNameEl.textContent = '';
});

messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const message = messageInput.value.trim();
  if (!message || !currentRoom) return;

  const time = formatTime(new Date());
  socket.emit('chat-message', {
    username: currentUsername,
    room: currentRoom,
    message,
    time,
  });

  messageInput.value = '';
  socket.emit('stop-typing', { username: currentUsername, room: currentRoom });
  if (typingTimeout) clearTimeout(typingTimeout);
  typingTimeout = null;
});

messageInput.addEventListener('input', () => {
  if (typingTimeout) clearTimeout(typingTimeout);
  socket.emit('typing', { username: currentUsername, room: currentRoom });
  typingTimeout = setTimeout(() => {
    socket.emit('stop-typing', { username: currentUsername, room: currentRoom });
    typingTimeout = null;
  }, 800);
});

messageInput.addEventListener('blur', () => {
  if (typingTimeout) clearTimeout(typingTimeout);
  socket.emit('stop-typing', { username: currentUsername, room: currentRoom });
  typingTimeout = null;
});
