// models/Transaction.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const TransactionSchema = new Schema({
  wallet: { type: Schema.Types.ObjectId, ref: 'Wallet' },
  type: { type: String, enum: ['topup','payout','escrow_hold','escrow_release','fee'] },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending','completed','failed'], default: 'pending' },
  metadata: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Transaction', TransactionSchema);