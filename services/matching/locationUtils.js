// src/services/matching/locationUtils.js
/**
 * Simple Haversine distance and normalized scoring.
 * Input locations use GeoJSON point format:
 *  { type: 'Point', coordinates: [lng, lat] }
 */

const EARTH_RADIUS_KM = 6371;

function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

function haversineDistanceKm(pointA, pointB) {
  if (!pointA || !pointB || !pointA.coordinates || !pointB.coordinates) return Infinity;
  const [lon1, lat1] = pointA.coordinates;
  const [lon2, lat2] = pointB.coordinates;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Convert distance to a 0..100 score.
 * - < 5 km => 100
 * - 5..20 km => linear 100..70
 * - 20..50 km => linear 70..40
 * - 50..100 km => linear 40..10
 * - >100 => 0
 */
function distanceToScore(distanceKm) {
  if (!isFinite(distanceKm)) return 0;
  if (distanceKm <= 5) return 100;
  if (distanceKm <= 20) return 100 - ((distanceKm - 5) / (20 - 5)) * 30; // 100 -> 70
  if (distanceKm <= 50) return 70 - ((distanceKm - 20) / (50 - 20)) * 30; // 70 -> 40
  if (distanceKm <= 100) return 40 - ((distanceKm - 50) / (100 - 50)) * 30; // 40 -> 10
  return 0;
}

/**
 * Public: calculate location score
 * If job is remote => 100 (unless candidate explicitly forbids remote — that check should be upstream)
 */
function calculateLocationScore(candidateLocation, jobLocation, jobRemoteOption = false) {
  if (jobRemoteOption) return 100;
  if (!candidateLocation || !candidateLocation.coordinates || !jobLocation || !jobLocation.coordinates) {
    // no location info -> give medium score (so availability/skills still count)
    return 50;
  }
  const dist = haversineDistanceKm(candidateLocation, jobLocation);
  return Math.round(distanceToScore(dist));
}

module.exports = { haversineDistanceKm, calculateLocationScore, distanceToScore };
