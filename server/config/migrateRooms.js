const Room = require('../models/Room');

/**
 * Migrates legacy members: [ObjectId] -> [{ userId, role }]
 */
async function migrateLegacyRoomMembers() {
  const rooms = await Room.find({}).lean();
  let updated = 0;
  for (const r of rooms) {
    const m = r.members;
    if (!m || !m.length) continue;
    const first = m[0];
    if (first && typeof first === 'object' && first.userId) continue;

    const newMembers = m.map((oid) => ({
      userId: oid,
      role: r.createdBy && String(oid) === String(r.createdBy) ? 'admin' : 'member',
    }));

    await Room.collection.updateOne(
      { _id: r._id },
      { $set: { members: newMembers } }
    );
    updated += 1;
  }
  if (updated) {
    console.log(`Migrated ${updated} room(s) to member subdocuments`);
  }
}

module.exports = { migrateLegacyRoomMembers };
