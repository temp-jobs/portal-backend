// src/services/matching/scoreUtils.js
const { calculateLocationScore } = require('./locationUtils');
const { calculateAvailabilityScore } = require('./availabilityUtils');
const weightsConfig = require('./weightsConfig');

const weights = weightsConfig.weights;

/**
 * Skills score:
 * matched required skills / required skills length * 100
 * If job requires 0 skills, treat as 100.
 */
function calculateSkillsScore(candidateSkills = [], requiredSkills = []) {
  if (!requiredSkills || requiredSkills.length === 0) return 100;
  if (!candidateSkills || candidateSkills.length === 0) return 0;

  const candidateSet = new Set(candidateSkills.map((s) => s.toLowerCase().trim()));
  const matched = requiredSkills.filter((rs) => candidateSet.has(String(rs).toLowerCase().trim())).length;
  return Math.round((matched / requiredSkills.length) * 100);
}

/**
 * Experience score: map job experienceLevel to required years
 * 'Entry' -> 0
 * 'Mid' -> 2
 * 'Senior' -> 5
 *
 * If requiredYears == 0 => candidate with any experience gets 100
 */
function calculateExperienceScore(candidateTotalYears = 0, experienceLevel = 'Entry') {
  const level = String(experienceLevel || 'Entry').toLowerCase();
  const required = level === 'entry' ? 0 : level === 'mid' ? 2 : 5;

  if (required === 0) return 100;
  const ratio = candidateTotalYears / required;
  const score = Math.min(Math.round(ratio * 100), 100);
  return score;
}

/**
 * Preferences score: salary alignment, industry match, remote preference
 * - salary: if job has min/max -> compare candidate preferredSalary
 * - industry: exact match -> bonus
 * - remote: if job is remote & candidate accepts remote -> bonus
 *
 * We'll normalize subcomponents to 0..100 then average them.
 */
function calculatePreferencesScore(candidate = {}, job = {}) {
  const parts = [];

  // salary alignment
  if (job.minSalary || job.maxSalary) {
    if (!candidate.preferredSalary) {
      // candidate didn't specify - neutral
      parts.push(50);
    } else {
      const pref = candidate.preferredSalary;
      const min = job.minSalary || job.maxSalary || pref;
      const max = job.maxSalary || job.minSalary || pref;
      if (pref < min) {
        // candidate expects less than min -> good for employer (score high)
        parts.push(100);
      } else if (pref > max) {
        // expects more than max -> low score
        parts.push(0);
      } else {
        // within range -> high
        parts.push(90);
      }
    }
  } else {
    // job no salary info => neutral
    parts.push(50);
  }

  // industry match
  if (candidate.preferredIndustry && job.industry) {
    parts.push(candidate.preferredIndustry.toLowerCase() === String(job.industry).toLowerCase() ? 100 : 50);
  } else {
    parts.push(50);
  }

  // remote preference
  // we assume candidate has boolean `acceptsRemote` (optional); fallback neutral.
  if (job.remoteOption) {
    if (candidate.acceptsRemote === true) parts.push(100);
    else if (candidate.acceptsRemote === false) parts.push(0);
    else parts.push(70);
  } else {
    // job not remote -> neutral
    parts.push(50);
  }

  const avg = parts.reduce((s, v) => s + v, 0) / parts.length;
  return Math.round(avg);
}

/**
 * Compute total weighted score (0-100)
 */
function computeTotalScore({ skillsScore, experienceScore, locationScore, availabilityScore, preferencesScore }) {
  const total =
    (skillsScore * weights.skills) +
    (experienceScore * weights.experience) +
    (locationScore * weights.location) +
    (availabilityScore * weights.availability) +
    (preferencesScore * weights.preferences);

  return Math.round(total);
}

module.exports = {
  calculateSkillsScore,
  calculateExperienceScore,
  calculatePreferencesScore,
  calculateLocationScore, // re-export if needed elsewhere
  calculateAvailabilityScore,
  computeTotalScore,
};
