// src/routes/matchingRoutes.js
const router = require('express').Router();
const matchingController = require('../controllers/matchingController');
const authMiddleware = require('../middleware/auth'); // optional
const roleMiddleware = require('../middleware/roleCheck'); // optional

// Jobseeker: get job recommendations
router.get('/jobseeker', authMiddleware, matchingController.getJobRecommendations);

// Employer: get candidate recommendations for a job
// `?onlyApplied=true` to limit to applicants only
router.get('/employer/:jobId', authMiddleware, roleMiddleware(['employer']), matchingController.getCandidateRecommendations);

module.exports = router;
