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
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    const { title, description, location } = req.body;

    try {
      const job = new Job({
        title,
        description,
        location,
        employer: req.user.id,
      });

      await job.save();
      res.json(job);
    } catch (err) {
      res.status(500).send('Server error');
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
router.get('/jobs', auth, async (req, res) => {
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
  [
    body('title').optional().trim().notEmpty(),
    body('description').optional().trim().notEmpty(),
    body('location').optional().trim().notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    try {
      const job = await Job.findById(req.params.id);
      if (!job) return res.status(404).json({ message: 'Job not found' });
      if (job.employer.toString() !== req.user.id)
        return res.status(403).json({ message: 'Not authorized' });

      const { title, description, location } = req.body;
      if (title) job.title = title;
      if (description) job.description = description;
      if (location) job.location = location;

      await job.save();
      res.json(job);
    } catch (err) {
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
    if (job.employer.toString() !== req.user.id)
      return res.status(403).json({ message: 'Not authorized' });

    await job.remove();
    await Application.deleteMany({ job: req.params.id });
    res.json({ message: 'Job removed' });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

module.exports = router;
