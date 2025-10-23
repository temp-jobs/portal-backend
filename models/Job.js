const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema({
  day: { type: String },
  startTime: { type: String },
  endTime: { type: String },
});

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  category: { type: String, required: true },
  type: { type: String, enum: ['Full-time', 'Part-time', 'Internship', 'Contract', 'Freelance', 'Remote'], required: true },
  experienceLevel: { type: String, enum: ['Entry', 'Mid', 'Senior'], required: true },
  location: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
  availability: [availabilitySchema],
  remoteOption: { type: Boolean, default: false },
  industry: { type: String },

  salaryType: { type: String, enum: ['Fixed', 'Range', 'Variable'], default: 'Range' },
  minSalary: { type: Number },
  maxSalary: { type: Number },
  currency: { type: String, default: 'INR' },
  benefits: [{ type: String }],

  skillsRequired: [{ type: String }],
  education: { type: String },
  openings: { type: Number, default: 1 },
  deadline: { type: Date },
  jobDuration: { type: String },

  employer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  companyName: { type: String },
  companyLogo: { type: String },

  status: { type: String, enum: ['Draft', 'Active', 'Closed'], default: 'Active' },
  views: { type: Number, default: 0 },
  applications: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now }
});

jobSchema.index({ location: '2dsphere' }); // geospatial index for job search

module.exports = mongoose.model('Job', jobSchema);
