const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');

// @route GET /api/profile
// @desc Get logged in user profile
// @access Private
router.get('/employer', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'employer') {
      res.json(user);
    } else {
      res.message("Access Denied")
    }

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.get('/jobseeker', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'jobseeker') {
      res.json(user);
    } else {
      res.message("Access Denied")
    }

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route PUT /api/profile
// @desc Update base profile info (name only for now)
// @access Private

/**
 * @route   PUT /employer
 * @desc    Update employer profile details
 * @access  Private (Employer)
 */
router.put(
  '/employer',
  auth,
  [
    // ✅ Don't force `name` — it's auto-managed from companyName
    body('companyName').trim().notEmpty().withMessage('Company name is required'),
    body('website').optional().trim().isURL().withMessage('Invalid website URL'),
    body('industry').optional().trim(),
    body('location').optional().trim(),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Description too long'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });

    const { companyName, website, industry, location, description } = req.body;

    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      // Ensure this route is used only by employer users
      if (user.role !== 'employer') {
        return res.status(403).json({ message: 'Access denied. Not an employer account.' });
      }

      // ✅ Update allowed fields dynamically
      if (companyName) {
        user.companyName = companyName;
        // Optional: keep `name` in sync for consistency
        user.name = companyName;
      }
      if (website) user.website = website;
      if (industry) user.industry = industry;
      if (location) user.location = location;
      if (description) user.description = description;

      // ✅ Mark profile completed if essential fields exist
      const essentialFields = [user.companyName, user.industry, user.location];
      user.profileCompleted = essentialFields.every(Boolean);

      await user.save();

      res.json({
        message: 'Employer profile updated successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyName: user.companyName,
          website: user.website,
          industry: user.industry,
          location: user.location,
          description: user.description,
          profileCompleted: user.profileCompleted,
        },
      });
    } catch (err) {
      console.error('Employer profile update error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);


/**
 * @route   PUT /jobseeker
 * @desc    Update jobseeker profile details
 * @access  Private (Jobseeker)
 */
router.put(
  '/jobseeker',
  auth,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('skills')
      .optional()
      .isArray()
      .withMessage('Skills must be an array of strings'),
    body('experience')
      .optional()
      .isArray()
      .withMessage('Experience must be an array [years, jobType, availability]'),
    body('education')
      .optional()
      .isArray()
      .withMessage('Education must be an array [qualification, institute, passingYear]'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });

    const { name, skills, experience, education } = req.body;

    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      // Ensure this route is for jobseekers only
      if (user.role !== 'jobseeker') {
        return res.status(403).json({ message: 'Access denied. Not a jobseeker account.' });
      }

      // Update provided fields dynamically
      if (name) user.name = name;
      if (skills) user.skills = skills;
      if (experience) user.experience = experience;
      if (education) user.education = education;

      // Mark profile as completed if essential fields exist
      const essentialFields = [user.name, user.skills?.length, user.education?.length];
      user.profileCompleted = essentialFields.every(Boolean);

      await user.save();

      res.json({
        message: 'Jobseeker profile updated successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          skills: user.skills,
          experience: user.experience,
          education: user.education,
          profileCompleted: user.profileCompleted,
        },
      });
    } catch (err) {
      console.error('Jobseeker profile update error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);



// @route POST /api/profile/jobseeker
// @desc Complete jobseeker profile and mark profileCompleted
// @access Private
router.post(
  '/jobseeker',
  auth,
  [
    body('skills', 'Skills are required').isArray({ min: 1 }),
    body('skills.*', 'Skills must be strings').isString(),
    body('experience', 'Experience is required').isArray({ min: 1 }),
    body('experience.*', 'Experience must be strings').isString(),
    body('education', 'Education is required').isArray({ min: 1 }),
    body('education.*', 'Education must be strings').isString(),
  ],
  async (req, res) => {
    if (!req.user.id) return res.status(401).json({ message: 'Unauthorized' });

    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });

    const { skills, experience, education } = req.body;

    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      if (user.role !== 'jobseeker') {
        return res.status(403).json({ message: 'Unauthorized role for this endpoint' });
      }

      user.skills = skills;
      user.experience = experience;
      user.education = education;
      user.profileCompleted = true;

      await user.save();

      res.json({ user, message: 'Jobseeker profile completed successfully' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route POST /api/profile/employer
// @desc Complete employer profile and mark profileCompleted
// @access Private


router.post(
  '/employer',
  auth,
  [
    body('companyWebsite')
      .optional()
      .isURL()
      .withMessage('Company website must be a valid URL'),
  ],
  async (req, res) => {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      if (user.role !== 'employer') {
        return res.status(403).json({ message: 'Unauthorized role for this endpoint' });
      }

      const { companyName, companyWebsite, companyDescription } = req.body;

      // Smart validation: only required if not already filled
      if (!companyName && !user.companyName) {
        return res.status(400).json({ message: 'Company name is required' });
      }
      if (!companyDescription && !user.companyDescription) {
        return res.status(400).json({ message: 'Company description is required' });
      }

      // Update only provided fields
      if (companyName) user.companyName = companyName.trim();
      if (companyWebsite) user.companyWebsite = companyWebsite.trim();
      if (companyDescription) user.companyDescription = companyDescription.trim();

      // Mark profile as completed if all mandatory fields exist
      user.profileCompleted = true;

      await user.save();

      res.json({
        message: 'Employer profile updated successfully',
        user,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);


module.exports = router;