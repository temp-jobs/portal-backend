// controllers/otpController.js
const crypto = require('crypto');
const User = require('../models/User');
const OtpTempUser = require('../models/OtpTempUser');
const { sendOtpEmail } = require('../utils/email');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const OTP_EXP_MIN = Number(process.env.OTP_EXPIRATION_MINUTES) || 10;
const RESEND_COOLDOWN = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 60;

// helper to create numeric OTP (6 digits)
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

// ======================
// Send OTP to temp user
// ======================
exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    // check if email already exists in main users
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    // find or create temp user
    let tempUser = await OtpTempUser.findOne({ email });
    if (!tempUser) return res.status(400).json({ message: 'No pending registration for this email' });

    // rate limit
    if (tempUser.otpResendAt && tempUser.otpResendAt > Date.now()) {
      const waitSec = Math.ceil((tempUser.otpResendAt - Date.now()) / 1000);
      return res.status(429).json({ message: `Please wait ${waitSec} seconds before resending OTP` });
    }

    const otp = generateOtp();
    tempUser.otpCode = hashOtp(otp);
    tempUser.otpExpires = Date.now() + OTP_EXP_MIN * 60 * 1000;
    tempUser.otpResendAt = Date.now() + RESEND_COOLDOWN * 1000;
    tempUser.otpAttempts = 0;
    await tempUser.save();

    await sendOtpEmail({ to: email, otp, minutes: OTP_EXP_MIN });

    res.json({ message: `OTP resent to ${email}`, email });
  } catch (err) {
    console.error('sendOtp error', err);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
};

// ======================
// Verify OTP and create user
// ======================
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP required' });

    const tempUser = await OtpTempUser.findOne({ email });
    if (!tempUser) return res.status(400).json({ message: 'No pending registration found' });

    if (tempUser.otpExpires < Date.now())
      return res.status(400).json({ message: 'OTP expired' });

    if (hashOtp(otp) !== tempUser.otpCode) {
      tempUser.otpAttempts += 1;
      await tempUser.save();
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // OTP valid → create main User
    const newUser = new User({
      name: tempUser.name,
      companyName: tempUser.companyName,
      email: tempUser.email,
      password: tempUser.password,
      role: tempUser.role,
      isVerified: true,
    });
    await newUser.save();

    // delete temp record
    await tempUser.deleteOne();

    // generate JWT
    const payload = { user: { id: newUser.id, role: newUser.role } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Registration verified and account created',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        companyName: newUser.companyName,
        email: newUser.email,
        role: newUser.role,
        profileCompleted: newUser.profileCompleted,
      },
    });
  } catch (err) {
    console.error('verifyOtp error', err);
    res.status(500).json({ message: 'Verification failed' });
  }
};

// ======================
// Resend OTP for temp user
// ======================
exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    const tempUser = await OtpTempUser.findOne({ email });
    if (!tempUser) return res.status(400).json({ message: 'No pending registration for this email' });

    if (tempUser.otpResendAt && tempUser.otpResendAt > Date.now()) {
      const waitSec = Math.ceil((tempUser.otpResendAt - Date.now()) / 1000);
      return res.status(429).json({ message: `Please wait ${waitSec} seconds before resending OTP` });
    }

    const otp = generateOtp();
    tempUser.otpCode = hashOtp(otp);
    tempUser.otpExpires = Date.now() + OTP_EXP_MIN * 60 * 1000;
    tempUser.otpResendAt = Date.now() + RESEND_COOLDOWN * 1000;
    tempUser.otpAttempts = 0;
    await tempUser.save();

    await sendOtpEmail({ to: email, otp, minutes: OTP_EXP_MIN });

    res.json({ message: `OTP resent to ${email}`, email });
  } catch (err) {
    console.error('resendOtp error', err);
    res.status(500).json({ message: 'Failed to resend OTP' });
  }
};
