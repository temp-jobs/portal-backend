const mongoose = require('mongoose');
const crypto = require('crypto');

function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

const otpTempUserSchema = new mongoose.Schema({
  name: { type: String },
  companyName: { type: String },
  email: { type: String, required: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['jobseeker', 'employer'], required: true },
  otpCode: { type: String, required: true },       // hashed OTP
  otpExpires: { type: Date, required: true },
  otpAttempts: { type: Number, default: 0 },
  otpResendAt: { type: Date, default: Date.now },
}, { timestamps: true });

otpTempUserSchema.statics.hashOtp = hashOtp;

module.exports = mongoose.model('OtpTempUser', otpTempUserSchema);
