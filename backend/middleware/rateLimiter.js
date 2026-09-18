/**
 * Maktaba — middleware/rateLimiter.js
 * Basic rate limiting to slow down brute-force and scraping attempts.
 * A tighter limiter is applied to auth routes specifically.
 */

const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many requests, please try again later.' } },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many attempts, please try again later.' } },
});

module.exports = { apiLimiter, authLimiter };
