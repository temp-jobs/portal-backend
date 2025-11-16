// src/services/matching/weightsConfig.js
module.exports = {
  weights: {
    skills: 0.4,
    experience: 0.2,
    location: 0.15,
    availability: 0.15,
    preferences: 0.1,
  },
  // Minimum score threshold to consider a match (0-100)
  minMatchScore: 30,
  // Max number of cached matches per job / jobseeker
  cacheLimit: 50,
};
