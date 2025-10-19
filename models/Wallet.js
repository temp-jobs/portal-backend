// models/Wallet.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const WalletSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', unique: true },
  balance: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Wallet', WalletSchema);