// models/Message.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const AttachmentSchema = new Schema({
  url: { type: String, required: true },
  filename: { type: String },
  mimeType: { type: String },
  size: { type: Number }
}, { _id: false });

const MessageSchema = new Schema({
  from: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: Schema.Types.ObjectId, ref: 'User', default: null }, // direct message target
  roomId: { type: String, index: true, default: null }, // room or conversation id
  content: { type: String, trim: true, default: '' },
  attachments: { type: [AttachmentSchema], default: [] },
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  metadata: { type: Schema.Types.Mixed, default: {} }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
MessageSchema.index({ roomId: 1, createdAt: -1 });
MessageSchema.index({ from: 1, to: 1, createdAt: -1 });

// Fetch a page of messages for a room or 1:1 conversation
MessageSchema.statics.fetchConversation = async function ({ roomId, userA, userB, limit = 50, before }) {
  const query = {};
  if (roomId) {
    query.roomId = roomId;
  } else if (userA && userB) {
    query.$or = [
      { from: userA, to: userB },
      { from: userB, to: userA }
    ];
  } else {
    throw new Error('Either roomId or both userA and userB are required');
  }

  if (before) {
    query.createdAt = { $lt: before };
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .lean();
};

MessageSchema.methods.markAs = function (status) {
  if (!['sent', 'delivered', 'read'].includes(status)) return this;
  this.status = status;
  return this.save();
};

module.exports = mongoose.model('Message', MessageSchema);