// src/routes/walletRoutes.js
const express = require('express');
const router = express.Router();
const { createWallet, topUpWallet, paymentWebhook, transferFunds, getWallet, getTransactions, confirmTopUp } = require('../controllers/walletController');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User')

router.get('/', authMiddleware, getWallet)
router.post('/create', authMiddleware, createWallet);
router.post('/topup', authMiddleware, topUpWallet);
router.post('/webhook', express.json({ type: '*/*' }), paymentWebhook); // Razorpay sends JSON
router.post('/transfer', authMiddleware, transferFunds);  // <-- new endpoint
router.get('/transactions', authMiddleware, getTransactions);
router.post('/payment/success', authMiddleware, confirmTopUp);
router.get('/users/candidates', authMiddleware, async (req, res) => {
  const users = await User.find({ _id: { $ne: req.user.id } }).select('name role');
  res.json(users.map(u => ({ id: u._id, name: u.name || u.companyName })));
});

module.exports = router;
