const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['public', 'private', 'chatbot'], required: true },
    members: [memberSchema],
    inviteCode: { type: String, sparse: true, unique: true },
    inviteExpires: { type: Date },
  },
  { timestamps: true }
);

roomSchema.index({ createdBy: 1, name: 1 }, { unique: true });
roomSchema.index({ 'members.userId': 1 });

module.exports = mongoose.model('Room', roomSchema);
