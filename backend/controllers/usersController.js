/**
 * Maktaba — controllers/usersController.js
 * Handles GET /api/users/profile (requires authMiddleware.requireAuth).
 */

const userService = require('../services/userService');
const { ok, fail } = require('../utils/response');

async function profile(req, res, next) {
  try {
    const data = await userService.getProfile(req.user.id);
    if (!data) return fail(res, 'User not found', 404);
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
}

module.exports = { profile };
