const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.MAIL_PORT || '465'),
  secure: process.env.MAIL_PORT === '465' || process.env.MAIL_SECURE === 'true',
  auth: {
    user: process.env.MAIL_USERNAME || 'soporte@kayparts.co',
    pass: process.env.MAIL_PASSWORD
  }
});

// Verification to ensure transporter is correctly configured
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP Mail Transporter configuration failed:', error.message);
  } else {
    console.log('✅ SMTP Mail Transporter is ready to send emails.');
  }
});

module.exports = transporter;
