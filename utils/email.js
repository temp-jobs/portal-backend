// utils/email.js (append or modify)
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SMTP_HOST,
  port: Number(process.env.EMAIL_SMTP_PORT) || 587,
  secure: process.env.EMAIL_SMTP_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_SMTP_USER,
    pass: process.env.EMAIL_SMTP_PASS,
  },
});

async function sendOtpEmail({ to, otp, minutes }) {
  const html = `
    <p>Hello,</p>
    <p>Your verification code is: <strong>${otp}</strong></p>
    <p>This code will expire in ${minutes} minutes.</p>
    <p>If you did not request this, please ignore this email.</p>
    <p>— Part Time Match</p>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: 'Your Part Time Match verification code',
    html,
    replyTo: "no-reply@invalid.com"
  });
}

module.exports = { sendOtpEmail};
