const mongoose = require('mongoose');
const { Schema } = mongoose;

const candidateMatchSchema = new Schema({
  candidateId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  score: { type: Number, required: true },
});

const jobMatchSchema = new Schema({
  jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
  score: { type: Number, required: true },
});

const MatchSchema = new Schema({
  jobId: { type: Schema.Types.ObjectId, ref: 'Job' },
  candidateMatches: [candidateMatchSchema], // top candidates for this job

  jobseekerId: { type: Schema.Types.ObjectId, ref: 'User' },
  jobMatches: [jobMatchSchema], // top jobs for this jobseeker

  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Match', MatchSchema);
