// src/services/matching/matchCacheService.js
/**
 * Stores / retrieves match cache in Match collection.
 * If you use Redis as well, implement Redis set/get here to speed up reads.
 */

const Match = require('../../models/Match'); // adjust path as needed
const weightsConfig = require('./weightsConfig');

async function updateJobMatchCache(jobId, candidateMatches = []) {
  // candidateMatches: [{ candidateId, score }]
  const trimmed = candidateMatches.slice(0, weightsConfig.cacheLimit);
  const update = {
    jobId,
    candidateMatches: trimmed,
    lastUpdated: new Date(),
  };
  await Match.findOneAndUpdate({ jobId }, update, { upsert: true, new: true });
}

async function updateJobseekerMatchCache(jobseekerId, jobMatches = []) {
  const trimmed = jobMatches.slice(0, weightsConfig.cacheLimit);
  const update = {
    jobseekerId,
    jobMatches: trimmed,
    lastUpdated: new Date(),
  };
  await Match.findOneAndUpdate({ jobseekerId }, update, { upsert: true, new: true });
}

async function getJobMatchesFromCache(jobId) {
  const doc = await Match.findOne({ jobId }).lean();
  return doc ? doc.candidateMatches : null;
}

async function getJobseekerMatchesFromCache(jobseekerId) {
  const doc = await Match.findOne({ jobseekerId }).lean();
  return doc ? doc.jobMatches : null;
}

module.exports = {
  updateJobMatchCache,
  updateJobseekerMatchCache,
  getJobMatchesFromCache,
  getJobseekerMatchesFromCache,
};
