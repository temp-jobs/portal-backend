// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { googleAuth } = require('../controllers/googleController');
const { sendOtp, verifyOtp, resendOtp } = require('../controllers/otpController');
const crypto = require('crypto');
const OtpTempUser = require('../models/OtpTempUser');
const { sendOtpEmail } = require('../utils/email');
function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}
// ==============================
// Register User
// ==============================

router.post(
  '/register',
  [
    body('email', 'Please include a valid email').isEmail().normalizeEmail(),
    body('password', 'Password must be 6+ chars').isLength({ min: 6 }),
    body('role', 'Role must be jobseeker or employer').isIn(['jobseeker', 'employer']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });

    const { name, email, password, role, companyName } = req.body;

    try {
      // Check main DB first
      const existingUser = await User.findOne({ email });
      if (existingUser) return res.status(400).json({ message: 'User already exists' });

      // Check if temporary OTP user already exists
      let tempUser = await OtpTempUser.findOne({ email });
      if (tempUser) await tempUser.deleteOne(); // remove old OTP entry

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOtp = hashOtp(otp);

      // Create temporary OTP user
      tempUser = new OtpTempUser({
        name: role === 'jobseeker' ? name : undefined,
        companyName: role === 'employer' ? companyName : undefined,
        email,
        password: hashedPassword,
        role,
        otpCode: hashedOtp,
        otpExpires: Date.now() + 10 * 60 * 1000, // 10 min
        otpResendAt: Date.now(),
        otpAttempts: 0,
      });

      await tempUser.save();

      // Send OTP email
      await sendOtpEmail({ to: email, otp, minutes: 10 });

      // Response: do not return JWT yet
      res.json({
        success: true,
        message: 'OTP has been sent to your email',
        email: tempUser.email,
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// ==============================
// Login User
// ==============================
router.post(
  '/login',
  [
    body('email', 'Please include a valid email').isEmail().normalizeEmail(),
    body('password', 'Password is required').exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });

    const { email, password } = req.body;

    try {
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ message: 'Invalid credentials' });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

      const payload = { user: { id: user.id, role: user.role } };
      jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
        if (err) throw err;

        res.json({
          message: 'Login successful',
          token,
          user: {
            id: user.id,
            name: user.name,
            companyName: user.companyName,
            email: user.email,
            role: user.role,
            profileCompleted: user.profileCompleted,
          },
        });
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// ==============================
// Google Login (placeholder)
// ==============================
router.post('/google', googleAuth);


router.post('/send-otp', sendOtp);       // optional: for explicit request from frontend
router.post('/verify-otp', verifyOtp);   // frontend posts { email, otp } — returns token & user
router.post('/resend-otp', resendOtp);   // frontend posts { email } — returns message (rate limited)

module.exports = router;
