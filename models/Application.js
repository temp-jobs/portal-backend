const mongoose = require('mongoose');
const { Schema } = mongoose;

const ApplicationSchema = new Schema({
  job: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
  applicant: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  coverLetter: String,
  resumeUrl: String,
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'withdrawn', 'shortlisted'], default: 'pending' },
  appliedAt: { type: Date, default: Date.now },
  shortlisted: { type: Boolean, default: false },
  chatInitiated: { type: Boolean, default: false },
  matchScore: { type: Number, default: 0 } // optional caching
});

module.exports = mongoose.model('Application', ApplicationSchema);
