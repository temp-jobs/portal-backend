const mongoose = require('mongoose');

const educationSchema = new mongoose.Schema({
  level: { type: String, required: true },
  institute: { type: String },
  passingYear: { type: String },
  marksObtained: { type: String },
  totalMarks: { type: String },
  percentage: { type: String },
  documentUrl: { type: String }, // store file path or URL (not the file itself)
});

const experienceSchema = new mongoose.Schema({
  company: { type: String },
  position: { type: String },
  startDate: { type: String },
  endDate: { type: String },
  description: { type: String },
});

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

  // Jobseeker fields
  skills: { type: [String], default: [] },
  experience: [experienceSchema],
  education: [educationSchema],

  // Employer fields
  companyWebsite: { type: String, trim: true },
  companyDescription: { type: String, trim: true },
  companyLocation: { type: String, trim: true },
  companySize: { type: String, trim: true },
  companyIndustry: { type: String, trim: true },
});

module.exports = mongoose.model('User', userSchema);
