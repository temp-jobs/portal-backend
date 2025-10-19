// models/Chat.js
const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Chat', ChatSchema);
