// src/services/matching/matchingService.js
/**
 * Core matching service: filters, scores, ranks, and caches.
 *
 * NOTE: adjust model import paths per your project.
 */

const logger = require('../../utils/logger'); // optional
const User = require('../../models/User');
const Job = require('../../models/Job');
const Application = require('../../models/Application');

const {
  calculateSkillsScore,
  calculateExperienceScore,
  calculatePreferencesScore,
  calculateAvailabilityScore,
  computeTotalScore,
} = require('./scoreUtils');

const { calculateLocationScore } = require('./locationUtils');
const matchCacheService = require('./matchCacheService');
const weightsConfig = require('./weightsConfig');

// Helper: compute total experience (years) from experience array
function computeTotalExperienceYears(experienceArray = []) {
  if (!Array.isArray(experienceArray) || experienceArray.length === 0) return 0;
  let totalMonths = 0;
  for (const exp of experienceArray) {
    try {
      const start = exp.startDate ? new Date(exp.startDate) : null;
      const end = exp.endDate ? new Date(exp.endDate) : new Date();
      if (start && end && end > start) {
        totalMonths += (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      }
    } catch (err) {
      // ignore malformed dates
    }
  }
  return Math.round((totalMonths / 12) * 10) / 10; // one decimal year
}

/**
 * Hard filter: quick eliminate candidates.
 */
function hardFilter(job, candidate) {
  // only completed profiles
  if (!candidate.profileCompleted) return false;

  // skill must match at least 1 required skill (could be stricter)
  const reqSkills = job.skillsRequired || [];
  if (reqSkills.length > 0) {
    const candidateSet = new Set((candidate.skills || []).map((s) => String(s).toLowerCase().trim()));
    const matched = reqSkills.some((rs) => candidateSet.has(String(rs).toLowerCase().trim()));
    if (!matched) return false;
  }

  // education check if job requires specific education
  if (job.education) {
    const hasEdu = (candidate.education || []).some((e) => String(e.level || '').toLowerCase().includes(String(job.education).toLowerCase()));
    if (!hasEdu) return false;
  }

  // availability: if job specifies slots, candidate must have something overlapping (performance: cheap approximation)
  if (job.availability && job.availability.length) {
    if (!candidate.availability || candidate.availability.length === 0) return false;
  }

  // if job not remote and both have locations - we allow filtering by distance later
  // do not fail here to keep results; distance will be scored; but you can enforce a hard distance threshold if you want

  return true;
}

/**
 * Compute full score for a job vs candidate
 */
function computeScoreForJobCandidate({ job, candidate }) {
  const candidateTotalExp = candidate.totalExperience || computeTotalExperienceYears(candidate.experience || []);
  const skillsScore = calculateSkillsScore(candidate.skills || [], job.skillsRequired || []);
  const experienceScore = calculateExperienceScore(candidateTotalExp, job.experienceLevel);
  const locationScore = calculateLocationScore(candidate.location, job.location, job.remoteOption);
  const availabilityScore = calculateAvailabilityScore(candidate.availability || [], job.availability || []);
  const preferencesScore = calculatePreferencesScore(candidate, job);

  const total = computeTotalScore({
    skillsScore,
    experienceScore,
    locationScore,
    availabilityScore,
    preferencesScore,
  });

  return {
    total,
    breakdown: {
      skillsScore,
      experienceScore,
      locationScore,
      availabilityScore,
      preferencesScore,
    },
  };
}

/**
 * Compute top candidate matches for a job and cache them.
 * - If useCacheOnly true -> return cache (if any) otherwise compute.
 */
async function computeJobMatches(jobId, { limit = 50, useCacheOnly = false } = {}) {
  const cached = await matchCacheService.getJobMatchesFromCache(jobId);
  if (useCacheOnly && cached) return cached.slice(0, limit);

  const job = await Job.findById(jobId).lean();
  if (!job) throw new Error('Job not found');

  // find candidate pool (optimize later: filter by skills using $in)
  const candidatesCursor = User.find({ role: 'jobseeker', profileCompleted: true }).cursor();

  const matches = [];
  for (let candidate = await candidatesCursor.next(); candidate != null; candidate = await candidatesCursor.next()) {
    try {
      if (!hardFilter(job, candidate)) continue;

      const { total } = computeScoreForJobCandidate({ job, candidate });

      if (total >= weightsConfig.minMatchScore) {
        matches.push({ candidateId: candidate._id, score: total });
      }
    } catch (err) {
      logger?.error?.('matchingService: error scoring candidate', err);
    }
  }

  matches.sort((a, b) => b.score - a.score);
  await matchCacheService.updateJobMatchCache(jobId, matches.slice(0, weightsConfig.cacheLimit));
  return matches.slice(0, limit);
}

/**
 * Compute top job matches for a jobseeker and cache them.
 */
async function computeJobseekerMatches(jobseekerId, { limit = 50, useCacheOnly = false } = {}) {
  const cached = await matchCacheService.getJobseekerMatchesFromCache(jobseekerId);
  if (useCacheOnly && cached) return cached.slice(0, limit);

  const candidate = await User.findById(jobseekerId).lean();
  if (!candidate) throw new Error('Candidate not found');

  // load active jobs (optimize later with filters)
  const jobsCursor = Job.find({ status: 'Active' }).cursor();

  const matches = [];
for (let job = await jobsCursor.next(); job != null; job = await jobsCursor.next()) {
  try {
    if (!hardFilter(job, candidate)) continue;

    const { total } = computeScoreForJobCandidate({ job, candidate });


    if (total >= weightsConfig.minMatchScore) {
      matches.push({
        job: job,          // include full job object
        matchPercentage: total, // rename for frontend clarity
      });
    }
  } catch (err) {
    logger?.error?.('matchingService: error scoring job', err);
  }
}

  matches.sort((a, b) => b.matchPercentage - a.matchPercentage);
  await matchCacheService.updateJobseekerMatchCache(jobseekerId, matches.slice(0, weightsConfig.cacheLimit));
  return matches.slice(0, limit);
}

/**
 * When a user applies -> compute their score for that job and store in Application.matchScore
 */
async function computeAndSaveApplicationScore(applicationId) {
  const application = await Application.findById(applicationId);
  if (!application) return null;

  const job = await Job.findById(application.job).lean();
  const candidate = await User.findById(application.applicant).lean();
  if (!job || !candidate) return null;

  const { total } = computeScoreForJobCandidate({ job, candidate });
  application.matchScore = total;
  await application.save();
  return total;
}

module.exports = {
  computeJobMatches,
  computeJobseekerMatches,
  computeAndSaveApplicationScore,
  computeScoreForJobCandidate, // export for testing
};
