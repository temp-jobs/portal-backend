const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  appliedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
});

module.exports = mongoose.model('Application', applicationSchema);