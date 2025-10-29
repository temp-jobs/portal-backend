const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const Application = require('../models/Application');
const Job = require('../models/Job');
const Chat = require('../models/Chat');
const matchingService = require('../services/matching/matchService')

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

// ✅ Get all applications for a given job (for employer dashboard)
router.get('/job/:jobId', auth, roleCheck('employer'), async (req, res) => {
  const jobId = req.params.jobId;

  try {
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    if (job.employer.toString() !== req.user.id)
      return res.status(403).json({ message: 'Not authorized' });

    // ✅ Get all applications for this job
    const applications = await Application.find({ job: jobId })
      .populate('applicant', 'name email skills experience education location profileCompleted')
      .lean();

    // ✅ Enrich each application with matchPercentage
    const enriched = await Promise.all(
      applications.map(async (app) => {
        let matchPercentage = app.matchScore;

        // compute if not already stored or if 0
        if (!matchPercentage || matchPercentage === 0) {
          const candidate = app.applicant;
          const { total } = await matchingService.computeScoreForJobCandidate({
            job,
            candidate,
          });

          matchPercentage = Math.round(total);
          // cache it in DB for future
          await Application.findByIdAndUpdate(app._id, { matchScore: matchPercentage });
        }

        return { ...app, matchPercentage };
      })
    );

    // ✅ Sort descending by match score
    enriched.sort((a, b) => b.matchPercentage - a.matchPercentage);

    return res.json(enriched);
  } catch (err) {
    console.error('Error fetching applicants with match score:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// // Employer updates application status
// router.put('/:applicationId/status', auth, roleCheck('employer'), async (req, res) => {
//   const { applicationId } = req.params;
//   const { status } = req.body; // expected: 'pending' | 'accepted' | 'rejected'

//   if (!['pending', 'accepted', 'rejected'].includes(status)) {
//     return res.status(400).json({ message: 'Invalid status' });
//   }

//   try {
//     const application = await Application.findById(applicationId).populate('job');
//     if (!application) return res.status(404).json({ message: 'Application not found' });

//     if (application.job.employer.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

//     application.status = status;
//     await application.save();

//     res.json({ message: 'Application status updated' });
//   } catch (err) {
//     res.status(500).send('Server error');
//   }
// });

// 🧩 Jobseeker gets all their job applications
router.get('/', auth, roleCheck('jobseeker'), async (req, res) => {
  try {
    const applications = await Application.find({ applicant: req.user.id })
      .populate({
        path: 'job',
        select: 'title companyName location',
      })
      .sort({ appliedAt: -1 });

    res.json(applications);
  } catch (err) {
    console.error('Error fetching applications:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// EMPLOYER changes application status and optionally initiates chat
router.put('/:applicationId/status', auth, roleCheck('employer'), async (req, res) => {
  const { applicationId } = req.params;
  const { status } = req.body; // 'pending' | 'accepted' | 'rejected' | 'shortlisted'

  const validStatuses = ['pending', 'accepted', 'rejected', 'shortlisted'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    // Fetch application along with job and applicant details
    const application = await Application.findById(applicationId)
      .populate('job')
      .populate('applicant', 'name email');

    if (!application) return res.status(404).json({ message: 'Application not found' });

    // Ensure employer owns the job
    if (application.job.employer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    let chat = null;

    // Handle shortlisted separately for chat initiation
    if (status === 'shortlisted') {
      application.shortlisted = true;

      // Find existing chat
      chat = await Chat.findOne({
        participants: { $all: [req.user.id, application.applicant._id] },
        job: application.job._id,
      });

      // Create new chat if not exists
      if (!chat) {
        chat = new Chat({
          participants: [req.user.id, application.applicant._id],
          job: application.job._id,
          initiatedBy: req.user.id,
        });
        await chat.save();
      }

      application.chatInitiated = true;
    }

    // Update application status
    application.status = status;
    await application.save();

    res.json({
      message:
        status === 'shortlisted'
          ? `Candidate ${application.applicant.name} shortlisted and chat initiated.`
          : `Application status updated to ${status}.`,
      chatId: chat ? chat._id : null,
    });
  } catch (err) {
    console.error('Error updating application status:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;