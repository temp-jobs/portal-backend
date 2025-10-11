const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');

// Jobseeker applies to a job
router.post('/:jobId/apply', auth, roleCheck('jobseeker'), async (req, res) => {
  const jobId = req.params.jobId;

  try {
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    // Check if already applied
    const existing = await Application.findOne({ job: jobId, applicant: req.user.id });
    if (existing) return res.status(400).json({ message: 'Already applied to this job' });

    const application = new Application({
      job: jobId,
      applicant: req.user.id,
    });
    await application.save();

    res.json({ message: 'Application submitted' });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Employer gets all applications for their job
router.get('/job/:jobId', auth, roleCheck('employer'), async (req, res) => {
  const jobId = req.params.jobId;

  try {
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.employer.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    const applications = await Application.find({ job: jobId })
      .populate('applicant', 'name email skills experience education')
      .sort({ appliedAt: -1 });

    res.json(applications);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Employer updates application status
router.put('/:applicationId/status', auth, roleCheck('employer'), async (req, res) => {
  const { applicationId } = req.params;
  const { status } = req.body; // expected: 'pending' | 'accepted' | 'rejected'

  if (!['pending', 'accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    const application = await Application.findById(applicationId).populate('job');
    if (!application) return res.status(404).json({ message: 'Application not found' });

    if (application.job.employer.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    application.status = status;
    await application.save();

    res.json({ message: 'Application status updated' });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

module.exports = router;