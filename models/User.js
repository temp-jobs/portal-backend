const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: function () {
      return this.role === 'jobseeker';
    },
  },
  companyName: {
    type: String,
    trim: true,
    required: function () {
      return this.role === 'employer';
    },
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: { type: String, required: true },
  role: { type: String, enum: ['jobseeker', 'employer'], required: true },
  profileCompleted: { type: Boolean, default: false },

  // Jobseeker profile fields
  skills: { type: [String], default: [] },
  experience: { type: [String], default: [] },
  education: { type: [String], default: [] },

  // Employer profile fields
  companyWebsite: { type: String, trim: true },
  companyDescription: { type: String, trim: true },
  companyLocation: { type: String, trim: true },
  companySize: { type: String, trim: true },
  companyIndustry: { type: String, trim: true }
});

module.exports = mongoose.model('User', userSchema);
