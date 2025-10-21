const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { body, validationResult } = require('express-validator');
const Job = require('../models/Job');
const Application = require('../models/Application');

/**
 * @route   POST /api/jobs/post-job
 * @desc    Create a job (Employer only)
 * @access  Private
 */
router.post(
  '/post-job',
  auth,
  roleCheck('employer'),
  [
    body('title', 'Title is required').trim().notEmpty(),
    body('description', 'Description is required').trim().notEmpty(),
    body('location', 'Location is required').trim().notEmpty(),
    body('category', 'Category is required').trim().notEmpty(),
    body('type', 'Job type is required').trim().notEmpty(),
    body('experienceLevel', 'Experience level is required').trim().notEmpty(),
    // Optional fields can have custom validations if needed
    body('salaryType').optional().isIn(['Fixed', 'Range', 'Variable']),
    body('minSalary').optional().isNumeric(),
    body('maxSalary').optional().isNumeric(),
    body('currency').optional().isString(),
    body('benefits').optional().isArray(),
    body('skillsRequired').optional().isArray(),
    body('education').optional().isString(),
    body('openings').optional().isInt({ min: 1 }),
    body('deadline').optional().isISO8601(),
    body('jobDuration').optional().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });

    try {
      const {
        title,
        description,
        location,
        category,
        type,
        experienceLevel,
        salaryType,
        minSalary,
        maxSalary,
        currency,
        benefits,
        skillsRequired,
        education,
        openings,
        deadline,
        jobDuration,
        companyName,
        companyLogo,
      } = req.body;

      const job = new Job({
        title,
        description,
        location,
        category,
        type,
        experienceLevel,
        employer: req.user.id, // required reference
        salaryType,
        minSalary,
        maxSalary,
        currency,
        benefits,
        skillsRequired,
        education,
        openings,
        deadline,
        jobDuration,
        companyName,
        companyLogo,
      });

      await job.save();
      res.json(job);
    } catch (err) {
      console.error('POST /post-job error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

/**
 * @route   GET /api/jobs/public
 * @desc    Public preview of jobs (for visitors)
 * @access  Public
 */
router.get('/public', async (req, res) => {
  try {
    // Only send limited fields — no employer details
    const jobs = await Job.find()
      .select('title location createdAt')
      .sort({ createdAt: -1 });

    res.json(jobs);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

/**
 * @route   GET /api/jobs
 * @desc    Get all jobs (for logged-in jobseekers)
 * @access  Private (Jobseeker)
 */
router.get('/', auth, async (req, res) => {
  try {
    const jobs = await Job.find()
      .populate('employer', 'name companyName companyWebsite')
      .sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

/**
 * @route   GET /api/jobs/:id
 * @desc    Get full job details (logged-in jobseeker only)
 * @access  Private (Jobseeker)
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate(
      'employer',
      'name companyName companyWebsite companyDescription'
    );
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json(job);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

/**
 * @route   PUT /api/jobs/:id
 * @desc    Update a job (Employer only, owner only)
 * @access  Private
 */
router.put(
  '/:id',
  auth,
  roleCheck('employer'),
  async (req, res) => {
    try {
      const job = await Job.findById(req.params.id);
      if (!job) return res.status(404).json({ message: 'Job not found' });
      if (job.employer.toString() !== req.user.id)
        return res.status(403).json({ message: 'Not authorized' });

      // Update only provided fields
      const updatableFields = [
        'title', 'description', 'location', 'category', 'type',
        'experienceLevel', 'salaryType', 'minSalary', 'maxSalary', 'currency',
        'benefits', 'skillsRequired', 'education', 'openings', 'deadline', 'jobDuration', 'status'
      ];

      updatableFields.forEach(field => {
        if (req.body[field] !== undefined) job[field] = req.body[field];
      });

      await job.save();
      res.json(job);
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  }
);


/**
 * @route   DELETE /api/jobs/:id
 * @desc    Delete a job (Employer only, owner only)
 * @access  Private
 */
router.delete('/:id', auth, roleCheck('employer'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) return res.status(404).json({ message: 'Job not found' });

    // Safety check: make sure employer exists and is a string
    if (!job.employer || job.employer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Remove job
    await job.deleteOne(); // safer than remove()

    // Remove related applications
    await Application.deleteMany({ job: job._id });

    res.json({ message: 'Job removed successfully' });
  } catch (err) {
    console.error('Delete Job Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
