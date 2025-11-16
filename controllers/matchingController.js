// src/controllers/matchingController.js
const matchingService = require('../services/matching/matchService');
const responseHandler = require('../utils/responseHandler'); // optional helper

async function getJobRecommendations(req, res) {
    try {
        console.log('REQ USER:', req.user.id);
        if (!req.user || !req.user.id) {
            return res.status(401).json(responseHandler.error('Unauthorized'));
        }
        const jobseekerId = req.user.id;
        const limit = Number(req.query.limit) || 20;
        const matches = await matchingService.computeJobseekerMatches(jobseekerId, { limit });
        return res.json(responseHandler.success({ matches }));
    } catch (err) {
        return res.status(500).json(responseHandler.error(err));
    }
}

async function getCandidateRecommendations(req, res) {
    try {
        const jobId = req.params.jobId;
        const onlyApplied = req.query.onlyApplied === 'true';
        const limit = Number(req.query.limit) || 20;

        if (onlyApplied) {
            // return only applied candidates with scores (pull from Application.matchScore)
            // We'll implement basic flow here:
            const Application = require('../models/Application');
            const apps = await Application.find({ job: jobId }).populate('applicant', 'name skills').lean();
            const results = apps.map((a) => ({ applicationId: a._id, applicant: a.applicant, score: a.matchScore ?? null, status: a.status }));
            return res.json(responseHandler.success({ candidates: results }));
        }

        const matches = await matchingService.computeJobMatches(jobId, { limit });
        return res.json(responseHandler.success({ matches }));
    } catch (err) {
        return res.status(500).json(responseHandler.error(err));
    }
}

module.exports = {
    getJobRecommendations,
    getCandidateRecommendations,
};
