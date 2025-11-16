const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const User = require('../models/User');
const { geocodePincode } = require('../helpers/geocode');


/**
 * 🔹 GET: Logged-in Employer Profile
 */
router.get('/employer', auth, roleCheck('employer'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * 🔹 GET: Logged-in Jobseeker Profile
 */
router.get('/jobseeker', auth, roleCheck('jobseeker'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * 🔹 PUT: Update Employer Profile
 */
router.put(
  '/employer',
  auth,
  roleCheck('employer'),
  [
    body('companyName').trim().notEmpty().withMessage('Company name is required'),
    body('companyWebsite').optional().isURL().withMessage('Invalid company website URL'),
    body('companyDescription').optional().trim().isLength({ max: 500 }).withMessage('Description too long'),
    body('companyLocation').optional().trim(),
    body('companyIndustry').optional().trim(),
    body('companySize').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });

    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const fields = ['companyName', 'companyWebsite', 'companyDescription', 'companyLocation', 'companyIndustry', 'companySize'];
      fields.forEach((field) => {
        if (req.body[field]) user[field] = req.body[field];
      });

      // Mark profile complete
      const essentialFields = [user.companyName, user.companyLocation];
      user.profileCompleted = essentialFields.every(Boolean);

      await user.save();

      res.json({
        message: 'Employer profile updated successfully',
        user,
      });
    } catch (err) {
      console.error('Employer profile update error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

/**
 * 🔹 PUT: Update Jobseeker Profile
 */
router.put(
  '/jobseeker',
  auth,
  roleCheck('jobseeker'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('skills').optional().isArray().withMessage('Skills must be an array'),
    body('experience').optional().isArray().withMessage('Experience must be an array'),
    body('education').optional().isArray().withMessage('Education must be an array'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });

    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const fields = ['name', 'skills', 'experience', 'education'];
      fields.forEach((field) => {
        if (req.body[field]) user[field] = req.body[field];
      });

      const essentialFields = [user.name, user.skills?.length, user.education?.length];
      user.profileCompleted = essentialFields.every(Boolean);
      console.log(user.profileCompleted)

      await user.save();

      res.json({
        message: 'Jobseeker profile updated successfully',
        user,
      });
    } catch (err) {
      console.error('Jobseeker profile update error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

/**
 * 🔹 POST: Complete Jobseeker Profile (initial creation)
 */
router.post(
  '/jobseeker',
  auth,
  roleCheck('jobseeker'),
  [
    body('skills').isArray({ min: 1 }).withMessage('Skills are required'),
    body('experience').isArray({ min: 1 }).withMessage('Experience is required'),
    body('education').isArray({ min: 1 }).withMessage('Education is required'),
    body('pincode').notEmpty().withMessage('Pincode is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });

    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const {
        skills,
        experience,
        education,
        availability,
        preferredSalary,
        preferredIndustry,
        pincode,
      } = req.body;

      // Convert pincode to coordinates
      let coordinates = [0, 0];
      if (pincode) {
        const geo = await geocodePincode(pincode);
        if (geo) coordinates = [geo.lng, geo.lat]; // GeoJSON: [lng, lat]
      }

      // Compute total experience in years
      const totalExperience = experience.reduce((sum, exp) => {
        if (exp.years) {
          if (exp.years === 'Fresher / No Experience') return sum;
          const yrs = exp.years.includes('>') ? parseInt(exp.years.replace('>', '')) : parseInt(exp.years);
          return sum + (isNaN(yrs) ? 0 : yrs);
        }
        return sum;
      }, 0);

      Object.assign(user, {
        skills,
        experience,
        education,
        availability,
        preferredSalary,
        preferredIndustry,
        totalExperience,
        location: { type: 'Point', coordinates },
        
        profileCompleted: true,
      });

      await user.save();

      res.json({ message: 'Jobseeker profile completed successfully', user });
    } catch (err) {
      console.error('Jobseeker profile create error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

/**
 * 🔹 POST: Complete Employer Profile (initial creation)
 */
router.post(
  '/employer',
  auth,
  roleCheck('employer'),
  [
    body('companyWebsite').optional().isURL().withMessage('Invalid URL'),
    body('companySize').optional().trim(),
    body('companyLocation').optional().trim(),
    body('companyDescription').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });

    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      Object.assign(user, req.body);
      user.profileCompleted = true;
      await user.save({ validateModifiedOnly: true }); // ✅ this line is key

      res.json({ message: 'Employer profile updated successfully', user });
    } catch (err) {
      console.error('Employer profile create/update error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);



module.exports = router;
