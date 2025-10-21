// src/controllers/walletController.js
const{ Wallet} = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const { createOrder, verifyPayment } = require('../services/razorpayServices');
const mongoose = require('mongoose')

// Create wallet for new user
async function createWallet(req, res) {
  try {
    const userId = req.user.id;
    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      wallet = await Wallet.create({ userId, balance: 0 });
    }
    res.json(wallet);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Wallet creation failed' });
  }
}

// Generate payment order for top-up
async function topUpWallet(req, res) {
  try {
    const { amount } = req.body; // in rupees
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });

    const wallet = await Wallet.findOne({ userId: req.user.id });
    if (!wallet) return res.status(404).json({ message: 'Wallet not found' });

    const order = await createOrder(amount * 100); // Razorpay expects paise
    // Create transaction record
    await Transaction.create({
      walletId: wallet._id,
      type: 'CREDIT',
      amount: amount * 100,
      method: 'RAZORPAY',
      referenceId: order.id,
      status: 'PENDING',
      description: 'Wallet Top-up',
    });

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Top-up failed' });
  }
}



async function transferFunds(req, res) {
  const { receiverId, amount, description } = req.body;
  const senderId = req.user.id;

  if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });
  if (senderId === receiverId) return res.status(400).json({ message: 'Cannot pay yourself' });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const senderWallet = await Wallet.findOne({ userId: senderId }).session(session);
    const receiverWallet = await Wallet.findOne({ userId: receiverId }).session(session);

    if (!senderWallet || !receiverWallet) throw new Error('Wallet not found');
    if (senderWallet.balance < amount) throw new Error('Insufficient balance');

    senderWallet.balance -= amount;
    receiverWallet.balance += amount;

    await senderWallet.save({ session });
    await receiverWallet.save({ session });

    // Record transactions for both
    await Transaction.create([
      {
        walletId: senderWallet._id,
        senderId,
        receiverId,
        type: 'PAYMENT_SENT',
        amount,
        status: 'SUCCESS',
        description,
      },
      {
        walletId: receiverWallet._id,
        senderId,
        receiverId,
        type: 'PAYMENT_RECEIVED',
        amount,
        status: 'SUCCESS',
        description,
      },
    ], { session, ordered: true });

    await session.commitTransaction();
    session.endSession();

    res.json({ message: 'Payment successful' });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: err.message });
  }
}

// Webhook to confirm payment
async function paymentWebhook(req, res) {
  try {
    const payload = req.body;
    const signature = req.headers['x-razorpay-signature'];

    const isValid = await verifyPayment(signature, payload.order_id, payload.payment_id);
    if (!isValid) return res.status(400).send('Invalid signature');

    const transaction = await Transaction.findOne({ referenceId: payload.order_id });
    if (!transaction) return res.status(404).send('Transaction not found');

    // Update transaction and wallet
    transaction.status = 'SUCCESS';
    await transaction.save();

    const wallet = await Wallet.findById(transaction.walletId);
    wallet.balance += transaction.amount;
    await wallet.save();

    res.json({ status: 'ok' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Webhook failed');
  }
}

async function confirmTopUp(req, res) {
  try {
    const { order_id, payment_id, signature } = req.body;

    const transaction = await Transaction.findOne({ referenceId: order_id });
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

    const isValid = await verifyPayment(signature, order_id, payment_id);
    if (!isValid) return res.status(400).json({ message: 'Invalid signature' });

    transaction.status = 'SUCCESS';
    await transaction.save();

    const wallet = await Wallet.findById(transaction.walletId);
    wallet.balance += transaction.amount;
    await wallet.save();

    res.json({ message: 'Wallet topped up successfully', balance: wallet.balance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Top-up confirmation failed' });
  }
}


// getWallet example
async function getWallet(req, res) {
  try {
    const userId = req.user.id;
    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      wallet = await Wallet.create({ userId, balance: 0 });
    }

    const transactions = await Transaction.find({ walletId: wallet._id }).sort({ createdAt: -1 });

    res.json({ balance: wallet.balance, transactions });
  } catch (err) {
    console.error('GET /wallet error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

async function getTransactions(req, res) {
  try {
    const wallet = await Wallet.findOne({ userId: req.user.id });
    if (!wallet) return res.status(404).json({ message: 'Wallet not found' });

    const transactions = await Transaction.find({ walletId: wallet._id }).sort({ createdAt: -1 });
    res.json(transactions);
  } catch (err) {
    console.error('GET /wallet/transactions error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

module.exports = { createWallet, getWallet, topUpWallet, transferFunds, paymentWebhook, getTransactions, confirmTopUp };

