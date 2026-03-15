const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 3000;

const MONGODB_URI =
"mongodb+srv://gurusharan4666_db_user:riABf765L2hCMCLc@cluster0.3kqbpcq.mongodb.net/chat-app?retryWrites=true&w=majority";

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("Connected to MongoDB Atlas"))
.catch(err => console.error("MongoDB connection error:", err));
// Message schema
const messageSchema = new mongoose.Schema({
  username: String,
  room: String,
  message: String,
  time: String,
});

const Message = mongoose.model('Message', messageSchema);

// Store online users per room: { roomName: Map<socketId, username> }
const onlineUsers = new Map();

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// --- Socket.io: chat room support ---
// All messaging uses socket.join(room); messages broadcast only to users in that room.

io.on('connection', (socket) => {
  // Client sends username and room name when joining
  socket.on('join-room', async ({ username, room }) => {
    const name = (username || '').trim();
    const roomName = (room || '').trim();
    if (!name || !roomName) {
      socket.emit('join-error', { message: 'Username and room name are required.' });
      return;
    }

    socket.username = name;
    socket.room = roomName;

    // Join the room so this socket receives only this room's events
    socket.join(roomName);

    // Track online user in this room
    if (!onlineUsers.has(roomName)) {
      onlineUsers.set(roomName, new Map());
    }
    onlineUsers.get(roomName).set(socket.id, name);

    // Load previous messages for this room from database
    try {
      const messages = await Message.find({ room: roomName }).sort({ _id: 1 }).limit(100).lean();
      socket.emit('previous-messages', messages);
    } catch (err) {
      console.error('Error loading messages:', err);
    }

    // Send updated online users list to everyone in this room only
    const usersInRoom = Array.from(onlineUsers.get(roomName).values());
    io.to(roomName).emit('online-users', usersInRoom);

    // Display a message when a user joins (broadcast to others in same room only)
    socket.to(roomName).emit('user-joined', { username: name, message: `${name} joined the room` });
  });

  // Chat message: broadcast only to users inside the same room
  socket.on('chat-message', async (data) => {
    const { username, room, message, time } = data;
    if (!room || message == null || message === '') return;

    try {
      const msg = new Message({ username, room, message, time });
      await msg.save();
    } catch (err) {
      console.error('Error saving message:', err);
    }

    io.to(room).emit('chat-message', { username, message, time });
  });

  socket.on('typing', ({ username, room }) => {
    if (room) socket.to(room).emit('typing', { username });
  });

  socket.on('stop-typing', ({ username, room }) => {
    if (room) socket.to(room).emit('stop-typing', { username });
  });

  socket.on('disconnect', () => {
    const roomName = socket.room;
    if (roomName && onlineUsers.has(roomName)) {
      onlineUsers.get(roomName).delete(socket.id);
      if (onlineUsers.get(roomName).size === 0) {
        onlineUsers.delete(roomName);
      } else {
        const usersInRoom = Array.from(onlineUsers.get(roomName).values());
        io.to(roomName).emit('online-users', usersInRoom);
      }
      socket.to(roomName).emit('user-left', {
        username: socket.username,
        message: `${socket.username || 'A user'} left the room`,
      });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
