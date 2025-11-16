const axios = require('axios');

async function geocodePincode(pincode) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error('Missing GOOGLE_MAPS_API_KEY');

  const encodedPincode = encodeURIComponent(pincode);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedPincode}&key=${key}`;

  const response = await axios.get(url, { timeout: 5000 });

  if (response.data.status !== 'OK' || !response.data.results.length) {
    throw new Error('Unable to geocode pincode');
  }

  const { lat, lng } = response.data.results[0].geometry.location;
  return { lat, lng };
}

module.exports = { geocodePincode };
