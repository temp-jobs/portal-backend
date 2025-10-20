const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  balance: { type: Number, default: 0 }, // smallest currency unit
}, { timestamps: true });



const transactionSchema = new mongoose.Schema({
  walletId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['PAYMENT_SENT', 'PAYMENT_RECEIVED', 'CREDIT', 'DEBIT'], required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED'], default: 'PENDING' },
  method: { type: String, default: 'WALLET' }, // could be RAZORPAY or WALLET
  referenceId: { type: String }, // gateway payment ID if external
  description: { type: String },
}, { timestamps: true });

// Prevent OverwriteModelError on hot reload / nodemon
const Wallet = mongoose.models.Wallet || mongoose.model('Wallet', walletSchema);
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

module.exports = { Wallet, Transaction };
