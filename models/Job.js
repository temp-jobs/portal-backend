const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  employer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Job', jobSchema);