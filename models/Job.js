const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  // --- Basic Info ---
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  category: { type: String, required: true },
  type: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Internship', 'Contract', 'Freelance', 'Remote'],
    required: true
  },
  experienceLevel: {
    type: String,
    enum: ['Entry', 'Mid', 'Senior'],
    required: true
  },
  location: { type: String, required: true, trim: true },

  // --- Salary ---
  salaryType: { type: String, enum: ['Fixed', 'Range', 'Variable'], default: 'Range' },
  minSalary: { type: Number },
  maxSalary: { type: Number },
  currency: { type: String, default: 'INR' },
  benefits: [{ type: String }],

  // --- Requirements ---
  skillsRequired: [{ type: String }],
  education: { type: String },
  openings: { type: Number, default: 1 },
  deadline: { type: Date },
  jobDuration: { type: String },

  // --- Employer (Company) Reference ---
  employer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Cached company fields (for faster job card rendering)
  companyName: { type: String },
  companyLogo: { type: String },

  // --- Status & Analytics ---
  status: { type: String, enum: ['Draft', 'Active', 'Closed'], default: 'Active' },
  views: { type: Number, default: 0 },
  applications: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Job', jobSchema);
