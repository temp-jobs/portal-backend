// src/services/matching/availabilityUtils.js
/**
 * Availability format:
 * [{ day: 'Monday', startTime: '09:00', endTime: '13:00' }, ...]
 *
 * Very conservative overlap logic: any overlap in the same day counts.
 */

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

function slotsOverlap(slotA, slotB) {
  const aStart = parseTimeToMinutes(slotA.startTime);
  const aEnd = parseTimeToMinutes(slotA.endTime);
  const bStart = parseTimeToMinutes(slotB.startTime);
  const bEnd = parseTimeToMinutes(slotB.endTime);
  if (aStart === null || aEnd === null || bStart === null || bEnd === null) return false;
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Calculate Availability Score (0-100)
 * Strategy:
 *  - For each job slot, check if candidate has any overlapping slot on same day.
 *  - Score = (matching job slots / total job slots) * 100
 *
 * If job has no slots specified, treat availability as OK => 100.
 */
function calculateAvailabilityScore(candidateSlots = [], jobSlots = []) {
  if (!jobSlots || jobSlots.length === 0) return 100;
  if (!candidateSlots || candidateSlots.length === 0) return 0;

  let matched = 0;
  for (const jobSlot of jobSlots) {
    const found = candidateSlots.some(
      (cSlot) => cSlot.day && jobSlot.day && cSlot.day.toLowerCase() === jobSlot.day.toLowerCase() && slotsOverlap(cSlot, jobSlot)
    );
    if (found) matched++;
  }

  return Math.round((matched / jobSlots.length) * 100);
}

module.exports = { calculateAvailabilityScore, slotsOverlap };
