const mongoose = require('mongoose');
const Room = require('../models/Room');
const { generateInviteCode } = require('../utils/inviteCode');
const { findMemberEntry, isMember, isAdmin, normalizeMembers } = require('../helpers/roomMember');

const INVITE_TTL_MS =
  (Number(process.env.INVITE_EXPIRES_HOURS) || 24) * 60 * 60 * 1000;

function inviteExpiryDate() {
  return new Date(Date.now() + INVITE_TTL_MS);
}

async function getRoomById(roomId) {
  if (!roomId || !mongoose.isValidObjectId(roomId)) return null;
  return Room.findById(roomId);
}

async function assertRoomMemberOrPublicJoin(roomId, userId) {
  const room = await getRoomById(roomId);
  if (!room) {
    return { ok: false, code: 404, error: 'Room not found' };
  }
  const uid = new mongoose.Types.ObjectId(userId);

  if (isMember(room, uid)) {
    return { ok: true, room };
  }

  if (room.type === 'public') {
    const updated = await Room.findOneAndUpdate(
      { _id: room._id, 'members.userId': { $ne: uid } },
      { $push: { members: { userId: uid, role: 'member' } } },
      { new: true }
    );
    return { ok: true, room: updated || room };
  }

  return { ok: false, code: 403, error: 'Not a member of this room' };
}

async function assertRoomMember(roomId, userId) {
  const room = await getRoomById(roomId);
  if (!room) {
    return { ok: false, code: 404, error: 'Room not found' };
  }
  if (!isMember(room, userId)) {
    return { ok: false, code: 403, error: 'Not a member of this room' };
  }
  return { ok: true, room };
}

function assertSocketRoomMatch(socketRoomId, payloadRoomId) {
  const a = String(payloadRoomId || '');
  const b = String(socketRoomId || '');
  return a && b && a === b;
}

async function validatePrivateInvite(room, code) {
  if (room.type !== 'private') return { ok: false, error: 'Not a private room' };
  if (!code || String(code).trim() !== room.inviteCode) {
    return { ok: false, error: 'Invalid or missing invite code' };
  }
  if (room.inviteExpires && room.inviteExpires.getTime() < Date.now()) {
    return { ok: false, error: 'Invite code has expired' };
  }
  return { ok: true };
}

async function addMemberIfNotPresent(roomId, userId, role = 'member') {
  const uid = new mongoose.Types.ObjectId(userId);
  const existing = await Room.findOne({ _id: roomId, 'members.userId': uid });
  if (existing) return existing;
  return Room.findOneAndUpdate(
    { _id: roomId, 'members.userId': { $ne: uid } },
    { $push: { members: { userId: uid, role } } },
    { new: true }
  );
}

module.exports = {
  getRoomById,
  assertRoomMemberOrPublicJoin,
  assertRoomMember,
  assertSocketRoomMatch,
  validatePrivateInvite,
  addMemberIfNotPresent,
  inviteExpiryDate,
  findMemberEntry,
  isMember,
  isAdmin,
  normalizeMembers,
  generateInviteCode,
};
