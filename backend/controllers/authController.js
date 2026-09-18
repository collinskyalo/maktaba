/**
 * Maktaba — controllers/authController.js
 * POST /api/auth/register, /login, /forgot-password, /reset-password, /google
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const PasswordReset = require('../models/PasswordReset');
const env = require('../config/env');
const { signToken } = require('../utils/jwt');
const { ok, fail } = require('../utils/response');
const emailService = require('../services/emailService');
const googleAuthService = require('../services/googleAuthService');

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function validateRegisterBody(body) {
  const errors = [];
  if (!body.name || body.name.trim().length < 2) errors.push('Name must be at least 2 characters.');
  if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) errors.push('A valid email is required.');
  if (!body.password || body.password.length < 8) errors.push('Password must be at least 8 characters.');
  return errors;
}

function validateLoginBody(body) {
  const errors = [];
  if (!body.email) errors.push('Email is required.');
  if (!body.password) errors.push('Password is required.');
  return errors;
}

function validateForgotPasswordBody(body) {
  return body.email ? [] : ['Email is required.'];
}

function validateResetPasswordBody(body) {
  const errors = [];
  if (!body.token) errors.push('Reset token is required.');
  if (!body.password || body.password.length < 8) errors.push('Password must be at least 8 characters.');
  return errors;
}

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findByEmail(email);
    if (existing) return fail(res, 'An account with that email already exists', 409);

    const passwordHash = await bcrypt.hash(password, env.bcryptSaltRounds);
    const user = await User.create({ name, email, passwordHash });

    const token = signToken({ id: user.id, email: user.email });
    return ok(res, { user: User.toPublic(user), token }, 201);
  } catch (err) {
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user) return fail(res, 'Invalid email or password', 401);

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) return fail(res, 'Invalid email or password', 401);

    const token = signToken({ id: user.id, email: user.email });
    return ok(res, { user: User.toPublic(user), token });
  } catch (err) {
    return next(err);
  }
}

/**
 * Always responds the same way whether or not the email exists, so this
 * endpoint can't be used to discover which emails have accounts.
 */
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findByEmail(email);

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      await PasswordReset.create({
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      });
      await emailService.sendPasswordResetEmail(user, rawToken);
    }

    return ok(res, { message: 'If that email has an account, a reset link has been sent.' });
  } catch (err) {
    return next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const record = await PasswordReset.findValidByTokenHash(tokenHash);
    if (!record) return fail(res, 'This reset link is invalid or has expired', 400);

    const passwordHash = await bcrypt.hash(password, env.bcryptSaltRounds);
    await User.updatePasswordHash(record.user_id, passwordHash);
    await PasswordReset.markUsed(record.id);

    return ok(res, { message: 'Password updated. You can now log in with your new password.' });
  } catch (err) {
    return next(err);
  }
}

/** Placeholder — see services/googleAuthService.js for what's left to wire up. */
async function google(req, res, next) {
  try {
    if (!googleAuthService.isConfigured()) {
      return fail(res, 'Google sign-in is not configured yet', 501);
    }
    const profile = await googleAuthService.verifyIdToken(req.body.idToken);
    // TODO: find-or-create user from `profile`, then signToken(...) as above.
    return fail(res, 'Google sign-in is not implemented yet', 501);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  register, login, forgotPassword, resetPassword, google,
  validateRegisterBody, validateLoginBody, validateForgotPasswordBody, validateResetPasswordBody,
};
