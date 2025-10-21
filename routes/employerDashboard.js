const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const Job = require('../models/Job');
const Application = require('../models/Application');
const User = require('../models/User');
const Message = require('../models/Message');

/**
 * @route   GET /api/employer/dashboard
 * @desc    Employer dashboard summary
 * @access  Private (Employer)
 */
router.get('/', auth, roleCheck('employer'), async (req, res) => {
  try {
    const jobs = await Job.find({ employer: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    // count applications per job
    const jobIds = jobs.map(j => j._id);
    const applicationCounts = await Application.aggregate([
      { $match: { job: { $in: jobIds } } },
      { $group: { _id: '$job', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    applicationCounts.forEach(a => (countMap[a._id] = a.count));

    const jobsWithCounts = jobs.map(j => ({
      ...j,
      totalApplications: countMap[j._id] || 0,
    }));

    res.json(jobsWithCounts);
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/employer/dashboard/:jobId/applicants
 * @desc    Get all applicants for a specific job
 * @access  Private (Employer)
 */
router.get('/:jobId/applicants', auth, roleCheck('employer'), async (req, res) => {
  const { jobId } = req.params;

  try {
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.employer.toString() !== req.user.id)
      return res.status(403).json({ message: 'Not authorized' });

    const applications = await Application.find({ job: jobId })
      .populate('applicant', 'name email skills experience education')
      .sort({ appliedAt: -1 })
      .lean();

    res.json(applications);
  } catch (err) {
    console.error('Error fetching applicants:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PUT /api/employer/dashboard/shortlist/:applicationId
 * @desc    Shortlist a candidate
 * @access  Private (Employer)
 */
router.put('/shortlist/:applicationId', auth, roleCheck('employer'), async (req, res) => {
  try {
    const application = await Application.findById(req.params.applicationId).populate('job');
    if (!application) return res.status(404).json({ message: 'Application not found' });
    if (application.job.employer.toString() !== req.user.id)
      return res.status(403).json({ message: 'Not authorized' });

    application.status = 'shortlisted';
    await application.save();

    res.json({ message: 'Candidate shortlisted successfully', application });
  } catch (err) {
    console.error('Shortlist error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/employer/dashboard/initiate-chat/:applicantId
 * @desc    Employer initiates chat with shortlisted candidate
 * @access  Private (Employer)
 */
router.post('/initiate-chat/:applicantId', auth, roleCheck('employer'), async (req, res) => {
  try {
    const applicant = await User.findById(req.params.applicantId);
    if (!applicant) return res.status(404).json({ message: 'Applicant not found' });

    // Optional: check if the employer has any job where this applicant is shortlisted
    const existingShortlist = await Application.findOne({
      applicant: applicant._id,
      status: 'shortlisted',
    }).populate('job');

    if (!existingShortlist)
      return res.status(403).json({ message: 'You can only chat with shortlisted candidates' });

    // Create a roomId (unique per employer + applicant)
    const roomId = [req.user.id, applicant._id].sort().join('_');

    // Send system welcome message (optional)
    await Message.create({
      from: req.user.id,
      to: applicant._id,
      roomId,
      content: `Chat initiated by ${req.user.name}`,
      status: 'sent',
    });

    res.json({
      message: 'Chat initiated successfully',
      roomId,
      participant: {
        _id: applicant._id,
        name: applicant.name,
        email: applicant.email,
      },
    });
  } catch (err) {
    console.error('Chat initiation error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
