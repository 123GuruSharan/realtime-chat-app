const mongoose = require('mongoose');
const Message = require('../models/Message');
const roomService = require('../services/roomService');

async function listMessages(req, res, next) {
  try {
    const userId = req.user.id;
    const { roomId, page, limit } = req.query;
    const access = await roomService.assertRoomMember(roomId, userId);
    if (!access.ok) {
      return res.status(access.code).json({ error: access.error });
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Message.find({ roomId: new mongoose.Types.ObjectId(roomId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('username message time userId createdAt')
        .lean(),
      Message.countDocuments({ roomId: new mongoose.Types.ObjectId(roomId) }),
    ]);

    const messages = items.reverse().map((m) => ({
      username: m.username,
      message: m.message,
      time: m.time,
      userId: m.userId?.toString(),
      id: m._id.toString(),
      createdAt: m.createdAt,
    }));

    res.json({
      messages,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (e) {
    next(e);
  }
}

module.exports = { listMessages };
