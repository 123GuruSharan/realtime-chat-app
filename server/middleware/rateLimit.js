const rateLimit = require('express-rate-limit');

const createRoomLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { error: 'Too many room creations. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const joinRoomLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: 'Too many join attempts. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: { error: 'Too many requests. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { createRoomLimiter, joinRoomLimiter, authLimiter };
