const mongoose = require('mongoose');

function memberUserId(m) {
  if (!m) return null;
  if (m.userId) return m.userId;
  return m;
}

function normalizeMembers(room) {
  const raw = room.members || [];
  if (!raw.length) return [];
  const first = raw[0];
  if (first && first.userId) {
    return raw.map((x) => ({
      userId: x.userId,
      role: x.role || 'member',
    }));
  }
  return raw.map((oid) => ({
    userId: oid,
    role: room.createdBy && oid.equals(room.createdBy) ? 'admin' : 'member',
  }));
}

function findMemberEntry(room, userId) {
  const uid = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
  const list = normalizeMembers(room);
  return list.find((e) => e.userId.equals(uid)) || null;
}

function isMember(room, userId) {
  return !!findMemberEntry(room, userId);
}

function isAdmin(room, userId) {
  const entry = findMemberEntry(room, userId);
  return entry && entry.role === 'admin';
}

module.exports = {
  memberUserId,
  normalizeMembers,
  findMemberEntry,
  isMember,
  isAdmin,
};
