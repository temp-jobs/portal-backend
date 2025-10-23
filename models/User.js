const mongoose = require('mongoose');

const educationSchema = new mongoose.Schema({
  level: { type: String, required: true },
  institute: { type: String },
  passingYear: { type: String },
  marksObtained: { type: String },
  totalMarks: { type: String },
  percentage: { type: String },
  documentUrl: { type: String },
});

const experienceSchema = new mongoose.Schema({
  company: { type: String },
  position: { type: String },
  startDate: { type: Date },
  endDate: { type: Date },
  description: { type: String },
});

const availabilitySchema = new mongoose.Schema({
  day: { type: String }, // e.g., 'Monday'
  startTime: { type: String }, // e.g., '09:00'
  endTime: { type: String },   // e.g., '13:00'
});

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: function () { return this.role === 'jobseeker'; },
  },
  companyName: {
    type: String,
    trim: true,
    required: function () { return this.role === 'employer'; },
  },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['jobseeker', 'employer'], required: true },
  profileCompleted: { type: Boolean, default: false },

  // --- Jobseeker fields ---
  skills: { type: [String], default: [] },
  experience: [experienceSchema],
  totalExperience: { type: Number, default: 0 }, // computed from experience array
  education: [educationSchema],
  location: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [lng, lat]
  },
  availability: [availabilitySchema],
  preferredSalary: { type: Number },
  preferredIndustry: { type: String },

  // --- Employer fields ---
  companyWebsite: { type: String, trim: true },
  companyDescription: { type: String, trim: true },
  companyLocation: { type: String, trim: true },
  companySize: { type: String, trim: true },
  companyIndustry: { type: String, trim: true },
});

userSchema.index({ location: '2dsphere' }); // geospatial index for jobseeker

module.exports = mongoose.model('User', userSchema);
