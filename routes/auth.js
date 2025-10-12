const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public


// 🧩 Role-based registration
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
      let user = await User.findOne({ email });
      if (user)
        return res.status(400).json({ message: 'User already exists' });

      // ✅ Role-specific creation
      if (role === 'jobseeker') {
        if (!name)
          return res.status(400).json({ message: 'Name is required for jobseeker' });
        user = new User({ name, email, password, role });
      } else if (role === 'employer') {
        if (!companyName)
          return res.status(400).json({ message: 'Company name is required for employer' });
        user = new User({ companyName, email, password, role });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);

      await user.save();

      const payload = { user: { id: user.id, role: user.role } };
      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '7d' },
        (err, token) => {
          if (err) throw err;
          res.json({ token, user });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);




// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
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
      if (!user)
        return res.status(400).json({ message: 'Invalid credentials' });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res.status(400).json({ message: 'Invalid credentials' });

      // Include role in JWT payload for faster role checks
      const payload = { user: { id: user.id, role: user.role } };

      jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
        if (err) throw err;

        // Send back token and role-based user object
        res.json({
          message: 'Login successful',
          token,
          user: {
            id: user.id,
            name: user.name,
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


module.exports = router;