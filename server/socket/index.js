const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const { registerSocketHandlers } = require('./registerHandlers');

/** userId -> socket.id (single active connection per user) */
const userSocketIds = new Map();

function attachSocketIO(io) {
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace?.(/^Bearer\s+/i, '');
      if (!token) {
        return next(new Error('Authentication required'));
      }
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId).select('username');
      if (!user) {
        return next(new Error('User not found'));
      }
      socket.userId = user._id;
      socket.username = user.username;
      socket.user = {
        id: user._id.toString(),
        username: user.username,
      };
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const uid = socket.user.id;
    const prevSid = userSocketIds.get(uid);
    if (prevSid && prevSid !== socket.id) {
      const oldSocket = io.sockets.sockets.get(prevSid);
      if (oldSocket) oldSocket.disconnect(true);
    }
    userSocketIds.set(uid, socket.id);

    socket.on('disconnect', () => {
      if (userSocketIds.get(uid) === socket.id) {
        userSocketIds.delete(uid);
      }
    });

    registerSocketHandlers(io, socket);
  });
}

module.exports = { attachSocketIO };
