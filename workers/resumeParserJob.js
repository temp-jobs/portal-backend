// workers/resumeParserJob.js
const axios = require('axios');
const Application = require('../models/Application');
const User = require('../models/User');

module.exports = async function parseResume(job) {
  const { fileUrl, userId } = job.data;
  // call Affinda (example)
  const resp = await axios.post('https://api.affinda.com/v1/resumes', {
    // Affinda requires multipart/form-data; this is illustrative
    // Use axios + form-data to upload file or send URL according to API
  }, {
    headers: { Authorization: `Bearer ${process.env.AFFINDA_KEY}` }
  });

  const parsed = resp.data;
  // map parsed fields to user profile
  const user = await User.findById(userId);
  if (parsed.name) user.name = parsed.name;
  if (parsed.skills) user.skills = parsed.skills;
  if (parsed.education) user.education = parsed.education?.map(e => e.institution).join('; ');
  await user.save();
};