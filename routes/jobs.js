const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { body, validationResult } = require('express-validator');
const Job = require('../models/Job');
const Application = require('../models/Application');

// Create Job (Employer only)
router.post(
  '/',
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

// Get all jobs (public)
router.get('/', async (req, res) => {
  try {
    const jobs = await Job.find()
      .populate('employer', 'name companyName')
      .sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Get job details by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('employer', 'name companyName companyWebsite companyDescription');
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json(job);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Update job (Employer only, owner only)
router.put(
  '/:id',
  auth,
  roleCheck('employer'),
  [
    body('title', 'Title is required').optional().trim().notEmpty(),
    body('description', 'Description is required').optional().trim().notEmpty(),
    body('location', 'Location is required').optional().trim().notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    try {
      const job = await Job.findById(req.params.id);
      if (!job) return res.status(404).json({ message: 'Job not found' });
      if (job.employer.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

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

// Delete job (Employer only, owner only)
router.delete('/:id', auth, roleCheck('employer'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.employer.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    await job.remove();
    // Also delete related applications
    await Application.deleteMany({ job: req.params.id });

    res.json({ message: 'Job removed' });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

module.exports = router;