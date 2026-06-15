const express = require('express');
const {
  createRoom,
  joinRoom,
  listPublicRooms,
  myRooms,
  validateInvite,
  regenerateInvite,
  removeMember,
  deleteRoom,
  leaveRoom,
} = require('../controllers/roomController');
const { listMessages } = require('../controllers/messageController');
const { authMiddleware } = require('../middleware/auth');
const { createRoomLimiter, joinRoomLimiter } = require('../middleware/rateLimit');
const { validateBody, validateQuery } = require('../middleware/validate');
const schemas = require('../validation/schemas');

const router = express.Router();

router.post('/validate-invite', joinRoomLimiter, validateBody(schemas.validateInvite), validateInvite);

router.get('/messages', authMiddleware, validateQuery(schemas.messagesQuery), listMessages);

router.post(
  '/create-room',
  authMiddleware,
  createRoomLimiter,
  validateBody(schemas.createRoom),
  createRoom
);
router.post('/join-room', authMiddleware, joinRoomLimiter, validateBody(schemas.joinRoom), joinRoom);
router.get('/rooms', authMiddleware, listPublicRooms);
router.get('/my-rooms', authMiddleware, myRooms);

router.post('/rooms/:roomId/regenerate-invite', authMiddleware, regenerateInvite);
router.delete('/rooms/:roomId/members/:userId', authMiddleware, removeMember);
router.delete('/rooms/:roomId', authMiddleware, deleteRoom);
router.post('/rooms/:roomId/leave', authMiddleware, leaveRoom);

module.exports = router;
