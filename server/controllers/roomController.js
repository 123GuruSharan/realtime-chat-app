const mongoose = require('mongoose');
const Room = require('../models/Room');
const Message = require('../models/Message');
const roomService = require('../services/roomService');
const { isAdmin, isMember } = require('../helpers/roomMember');

const MAX_ROOMS_PER_USER = Number(process.env.MAX_ROOMS_PER_USER) || 5;

function toPublicRoom(r) {
  return {
    roomId: r._id.toString(),
    name: r.name,
    createdBy: r.createdBy?.toString(),
    type: 'public',
    createdAt: r.createdAt,
  };
}

function toMyRoomDto(room, userId) {
  const admin = isAdmin(room, userId);
  return {
    roomId: room._id.toString(),
    name: room.name,
    createdBy: room.createdBy?.toString(),
    type: room.type,
    createdAt: room.createdAt,
    role: isAdmin(room, userId) ? 'admin' : 'member',
    inviteCode: room.type === 'private' && admin ? room.inviteCode : undefined,
    inviteExpires: room.type === 'private' && admin ? room.inviteExpires : undefined,
  };
}

async function createRoom(req, res, next) {
  try {
    const userId = req.user.id;
    const { name, type } = req.body;

    const count = await Room.countDocuments({ createdBy: userId });
    if (count >= MAX_ROOMS_PER_USER) {
      return res.status(403).json({ error: `Maximum ${MAX_ROOMS_PER_USER} rooms per user` });
    }

    const dup = await Room.findOne({ createdBy: userId, name });
    if (dup) {
      return res.status(409).json({ error: 'You already have a room with this name' });
    }

    const User = require('../models/User');
    const chatbotUser = await User.findOne({ email: 'chatbot@system.local' });
    const uid = new mongoose.Types.ObjectId(userId);
    const members = [{ userId: uid, role: 'admin' }];
    if (type === 'chatbot' && chatbotUser) {
      members.push({ userId: chatbotUser._id, role: 'member' });
    }

    const payload = {
      name,
      createdBy: userId,
      type,
      members,
    };

    if (type === 'private') {
      payload.inviteCode = roomService.generateInviteCode(10);
      payload.inviteExpires = roomService.inviteExpiryDate();
    }

    const room = await Room.create(payload);
    res.status(201).json({ room: toMyRoomDto(room, userId) });
  } catch (e) {
    next(e);
  }
}

async function joinRoom(req, res, next) {
  try {
    const userId = req.user.id;
    const { roomId, inviteCode } = req.body;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const uid = new mongoose.Types.ObjectId(userId);
    if (isMember(room, uid)) {
      return res.json({ room: toMyRoomDto(room, userId), alreadyMember: true });
    }

    if (room.type === 'public') {
      await roomService.addMemberIfNotPresent(roomId, userId, 'member');
      const reloaded = await Room.findById(roomId);
      return res.json({ room: toMyRoomDto(reloaded, userId) });
    }

    const inv = await roomService.validatePrivateInvite(room, inviteCode);
    if (!inv.ok) {
      return res.status(403).json({ error: inv.error });
    }

    await roomService.addMemberIfNotPresent(roomId, userId, 'member');
    const reloaded = await Room.findById(roomId);
    res.json({ room: toMyRoomDto(reloaded, userId) });
  } catch (e) {
    next(e);
  }
}

async function listPublicRooms(req, res, next) {
  try {
    const rooms = await Room.find({ type: 'public' })
      .select('name createdBy type createdAt')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({ rooms: rooms.map(toPublicRoom) });
  } catch (e) {
    next(e);
  }
}

async function myRooms(req, res, next) {
  try {
    const userId = req.user.id;
    const uid = new mongoose.Types.ObjectId(userId);
    const rooms = await Room.find({ 'members.userId': uid }).sort({ updatedAt: -1 }).lean();

    res.json({
      rooms: rooms.map((r) => toMyRoomDto(r, userId)),
    });
  } catch (e) {
    next(e);
  }
}

async function validateInvite(req, res, next) {
  try {
    const { code } = req.body;
    const room = await Room.findOne({ inviteCode: code.trim(), type: 'private' }).select(
      'name inviteExpires'
    );
    if (!room) {
      return res.status(404).json({ valid: false, error: 'Invalid invite code' });
    }
    if (room.inviteExpires && room.inviteExpires.getTime() < Date.now()) {
      return res.status(400).json({ valid: false, error: 'Invite code has expired' });
    }
    res.json({
      valid: true,
      roomId: room._id.toString(),
      name: room.name,
    });
  } catch (e) {
    next(e);
  }
}

async function regenerateInvite(req, res, next) {
  try {
    const userId = req.user.id;
    const { roomId } = req.params;
    if (!mongoose.isValidObjectId(roomId)) {
      return res.status(400).json({ error: 'Invalid roomId' });
    }
    const room = await Room.findById(roomId);
    if (!room || room.type !== 'private') {
      return res.status(404).json({ error: 'Private room not found' });
    }
    if (!isAdmin(room, userId)) {
      return res.status(403).json({ error: 'Only an admin can regenerate the invite code' });
    }
    room.inviteCode = roomService.generateInviteCode(10);
    room.inviteExpires = roomService.inviteExpiryDate();
    await room.save();
    res.json({ inviteCode: room.inviteCode, inviteExpires: room.inviteExpires });
  } catch (e) {
    next(e);
  }
}

async function removeMember(req, res, next) {
  try {
    const adminId = req.user.id;
    const { roomId, userId: targetId } = req.params;
    if (!mongoose.isValidObjectId(roomId) || !mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    if (targetId === adminId) {
      return res.status(400).json({ error: 'Use leave endpoint to remove yourself' });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    if (!isAdmin(room, adminId)) {
      return res.status(403).json({ error: 'Only an admin can remove members' });
    }

    const targetOid = new mongoose.Types.ObjectId(targetId);
    if (!isMember(room, targetOid)) {
      return res.status(404).json({ error: 'User is not in this room' });
    }
    if (isAdmin(room, targetOid)) {
      return res.status(403).json({ error: 'Cannot remove another admin' });
    }

    await Room.updateOne({ _id: roomId }, { $pull: { members: { userId: targetOid } } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

async function deleteRoom(req, res, next) {
  try {
    const userId = req.user.id;
    const { roomId } = req.params;
    if (!mongoose.isValidObjectId(roomId)) {
      return res.status(400).json({ error: 'Invalid roomId' });
    }
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    if (!isAdmin(room, userId)) {
      return res.status(403).json({ error: 'Only an admin can delete this room' });
    }
    await Message.deleteMany({ roomId: room._id });
    await Room.deleteOne({ _id: room._id });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

async function leaveRoom(req, res, next) {
  try {
    const userId = req.user.id;
    const { roomId } = req.params;
    if (!mongoose.isValidObjectId(roomId)) {
      return res.status(400).json({ error: 'Invalid roomId' });
    }
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    const uid = new mongoose.Types.ObjectId(userId);
    if (!isMember(room, uid)) {
      return res.status(400).json({ error: 'Not a member' });
    }

    if (room.members.length === 1) {
      await Message.deleteMany({ roomId: room._id });
      await Room.deleteOne({ _id: room._id });
      return res.json({ ok: true, deleted: true });
    }

    const wasAdmin = isAdmin(room, uid);
    await Room.updateOne({ _id: roomId }, { $pull: { members: { userId: uid } } });

    const r2 = await Room.findById(roomId);
    if (r2 && wasAdmin) {
      const hasAdmin = r2.members.some((m) => m.role === 'admin');
      if (!hasAdmin && r2.members.length) {
        await Room.updateOne({ _id: roomId }, { $set: { 'members.0.role': 'admin' } });
      }
    }

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  createRoom,
  joinRoom,
  listPublicRooms,
  myRooms,
  validateInvite,
  regenerateInvite,
  removeMember,
  deleteRoom,
  leaveRoom,
};
