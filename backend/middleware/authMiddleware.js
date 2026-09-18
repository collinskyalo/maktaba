/**
 * Maktaba — middleware/authMiddleware.js
 * Guards routes that require a logged-in user. Expects
 * "Authorization: Bearer <token>". On success, attaches the decoded
 * payload (at least { id, email }) to req.user.
 */

const { verifyToken } = require('../utils/jwt');
const { fail } = require('../utils/response');
const User = require('../models/User');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return fail(res, 'Authentication required', 401);
  }

  try {
    req.user = verifyToken(token);
    return next();
  } catch (err) {
    return fail(res, 'Invalid or expired token', 401);
  }
}

/**
 * Must run after requireAuth. Looks the user up fresh (rather than
 * trusting a `role` baked into the JWT) so a role change or revoked
 * admin takes effect immediately instead of waiting for token expiry.
 */
async function requireAdmin(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return fail(res, 'Admin access required', 403);
    }
    req.user = User.toPublic(user);
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { requireAuth, requireAdmin };
