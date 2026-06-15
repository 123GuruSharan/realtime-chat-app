const mongoose = require('mongoose');
const Message = require('../models/Message');
const roomService = require('../services/roomService');

/** @type {Map<string, Map<string, string>>} roomId -> userId -> username */
const onlineByRoom = new Map();

function getOnlinePayload(roomId) {
  const m = onlineByRoom.get(roomId);
  if (!m || m.size === 0) return { userIds: [], usernames: [] };
  const userIds = [...m.keys()];
  const usernames = userIds.map((id) => m.get(id));
  return { userIds, usernames };
}

function addOnlineUser(roomId, userId, username) {
  const id = String(userId);
  if (!onlineByRoom.has(roomId)) onlineByRoom.set(roomId, new Map());
  onlineByRoom.get(roomId).set(id, username);
}

function removeOnlineUser(roomId, userId) {
  const m = onlineByRoom.get(roomId);
  if (!m) return;
  m.delete(String(userId));
  if (m.size === 0) onlineByRoom.delete(roomId);
}

function registerSocketHandlers(io, socket) {
  const user = socket.user;
  const userId = user.id;

  async function verifyAndLoadRoom(roomId) {
    if (!roomId || !mongoose.isValidObjectId(roomId)) {
      return { ok: false, error: 'Invalid room' };
    }
    return roomService.assertRoomMemberOrPublicJoin(roomId, userId);
  }

  socket.on('joinRoom', async (payload, ack) => {
    try {
      const roomId = payload && payload.roomId;
      const access = await verifyAndLoadRoom(roomId);
      if (!access.ok) {
        const errMsg = access.error || 'Join denied';
        if (typeof ack === 'function') ack({ ok: false, error: errMsg });
        socket.emit('join-error', { message: errMsg });
        return;
      }
      const room = access.room;

      if (socket.currentRoomId && socket.currentRoomId !== roomId) {
        const prev = socket.currentRoomId;
        socket.leave(prev);
        removeOnlineUser(prev, userId);
        io.to(prev).emit('online-users', getOnlinePayload(prev));
        socket.to(prev).emit('user-left', {
          username: user.username,
          message: `${user.username} left the room`,
        });
      }

      socket.join(roomId);
      socket.currentRoomId = roomId;

      addOnlineUser(roomId, userId, user.username);
      io.to(roomId).emit('online-users', getOnlinePayload(roomId));
      socket.to(roomId).emit('user-joined', {
        username: user.username,
        message: `${user.username} joined the room`,
      });

      if (typeof ack === 'function') ack({ ok: true, roomId });
    } catch (err) {
      console.error(err);
      if (typeof ack === 'function') ack({ ok: false, error: 'Server error' });
      socket.emit('join-error', { message: 'Join failed' });
    }
  });

  socket.on('chat-message', async (data) => {
    try {
      const roomId = data && data.roomId;
      if (!roomService.assertSocketRoomMatch(socket.currentRoomId, roomId)) return;

      const access = await roomService.assertRoomMember(roomId, userId);
      if (!access.ok) return;

      const text = data && data.message != null ? String(data.message).trim() : '';
      if (!text) return;

      const msg = await Message.create({
        roomId,
        userId: socket.userId,
        username: user.username,
        message: text.slice(0, 2000),
        time: data.time || new Date().toISOString(),
      });

      io.to(roomId).emit('chat-message', {
        username: user.username,
        message: msg.message,
        time: msg.time,
        userId: String(socket.userId),
        createdAt: msg.createdAt,
      });

      // AI Chatbot trigger
      const room = access.room;
      if (room && room.type === 'chatbot') {
        const User = require('../models/User');
        const chatbotUser = await User.findOne({ email: 'chatbot@system.local' });
        if (chatbotUser && String(socket.userId) !== chatbotUser._id.toString()) {
          // 1. Show bot typing status
          setTimeout(() => {
            io.to(roomId).emit('typing', { username: 'AI Chatbot' });
          }, 500);

          // 2. Generate and send response
          const botReply = getChatbotResponse(text, user.username);
          setTimeout(async () => {
            try {
              io.to(roomId).emit('stop-typing', { username: 'AI Chatbot' });

              const botMsg = await Message.create({
                roomId,
                userId: chatbotUser._id,
                username: 'AI Chatbot',
                message: botReply,
                time: formatTime(new Date()),
              });

              io.to(roomId).emit('chat-message', {
                username: 'AI Chatbot',
                message: botMsg.message,
                time: botMsg.time,
                userId: chatbotUser._id.toString(),
                createdAt: botMsg.createdAt,
              });
            } catch (botErr) {
              console.error('Failed to send chatbot message:', botErr);
            }
          }, 2000);
        }
      }
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('typing', async (payload) => {
    const roomId = payload && payload.roomId;
    if (!roomService.assertSocketRoomMatch(socket.currentRoomId, roomId)) return;
    const access = await roomService.assertRoomMember(roomId, userId);
    if (!access.ok) return;
    socket.to(roomId).emit('typing', { username: user.username });
  });

  socket.on('stop-typing', async (payload) => {
    const roomId = payload && payload.roomId;
    if (!roomService.assertSocketRoomMatch(socket.currentRoomId, roomId)) return;
    const access = await roomService.assertRoomMember(roomId, userId);
    if (!access.ok) return;
    socket.to(roomId).emit('stop-typing', { username: user.username });
  });

  socket.on('disconnect', () => {
    const roomId = socket.currentRoomId;
    if (!roomId) return;
    socket.leave(roomId);
    removeOnlineUser(roomId, userId);
    io.to(roomId).emit('online-users', getOnlinePayload(roomId));
    socket.to(roomId).emit('user-left', {
      username: user.username,
      message: `${user.username} left the room`,
    });
  });
}

function formatTime(date = new Date()) {
  let h = date.getHours();
  const m = date.getMinutes();
  const am = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const mm = m < 10 ? `0${m}` : m;
  return `${h}:${mm} ${am}`;
}

function getChatbotResponse(input, username) {
  const text = input.toLowerCase().trim();

  if (text === 'hi' || text === 'hello' || text === 'hey') {
    return `Hello ${username}! 👋 I am your built-in AI Chatbot assistant. How can I help you today?`;
  }
  
  if (text.includes('how are you')) {
    return `I am doing great, thank you for asking! 🤖 How are you doing?`;
  }

  if (text.includes('help') || text.includes('what can you do') || text === 'commands') {
    return `Here are some things I can do:
• Tell you a **joke** (type "joke")
• Give you the current **time** (type "time" or "date")
• Help you test the chat application (type "test")
• Just chat with you! Ask me anything.`;
  }

  if (text.includes('joke')) {
    const jokes = [
      "Why don't scientists trust atoms? Because they make up everything! ⚛️",
      "Why did the computer go to the doctor? Because it had a virus! 💻",
      "What do you call a fake noodle? An impasta! 🍝",
      "How many programmers does it take to change a light bulb? None, that's a hardware problem! 💡",
      "Why do Java programmers have to wear glasses? Because they don't C#! 🤓"
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }

  if (text.includes('time') || text.includes('date')) {
    const now = new Date();
    return `The current time and date is: **${now.toLocaleString()}** ⏰`;
  }

  if (text.includes('test')) {
    return `Testing, testing, 1-2-3! 🧪 The connection to the chat server and database is working perfectly. The date separator header shows "Today" correctly! Let me know if you want to test anything else.`;
  }

  if (text.includes('thank you') || text.includes('thanks')) {
    return `You're very welcome, ${username}! Happy to help. 😊`;
  }

  return `I hear you, ${username}! You said: "${input}". 

As an AI Chatbot in this MERN stack room, I'm here to chat. Type **help** to see all available commands!`;
}

module.exports = { registerSocketHandlers };
