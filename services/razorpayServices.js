// services/razorpayServices.js
const Razorpay = require('razorpay');
const crypto = require('crypto');

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Create Razorpay order
 * @param {number} amount - in paise
 */
async function createOrder(amount) {
  const options = {
    amount,
    currency: 'INR',
    receipt: `rcpt_${Date.now()}`,
  };
  return instance.orders.create(options);
}

/**
 * Verify Razorpay payment signature
 */
async function verifyPayment(signature, order_id, payment_id) {
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${order_id}|${payment_id}`)
    .digest('hex');

  return generatedSignature === signature;
}

module.exports = { createOrder, verifyPayment };
