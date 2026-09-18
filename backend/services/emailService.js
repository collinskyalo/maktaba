/**
 * Maktaba — services/emailService.js
 * Placeholder email sender. No real email provider is configured yet, so
 * this logs what would be sent — good enough for local development and
 * for keeping the reset-password flow fully testable end to end.
 *
 * TODO (later phase): replace sendMail()'s body with a real provider call
 * (e.g. AWS SES, SendGrid, Postmark). Keep the function signature the
 * same so authController never needs to change.
 */

const logger = require('../utils/logger');

async function sendMail({ to, subject, text }) {
  logger.info(`[emailService] Would send email to ${to} — "${subject}"\n${text}`);
  return { sent: true, mocked: true };
}

async function sendPasswordResetEmail(user, rawToken) {
  const resetLink = `https://maktaba.example.com/reset-password.html?token=${rawToken}`;
  return sendMail({
    to: user.email,
    subject: 'Reset your Maktaba password',
    text: `Hi ${user.name}, use this link to reset your password (valid for 1 hour): ${resetLink}`,
  });
}

module.exports = { sendMail, sendPasswordResetEmail };
