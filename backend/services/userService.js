/**
 * Maktaba — services/userService.js
 * Business logic for user accounts, kept separate from authController so
 * profile-related logic (Phase 6/7 dashboard: downloads, reading history,
 * wishlist) has a home that isn't the HTTP layer.
 */

const User = require('../models/User');
const Download = require('../models/Download');
const ReadingHistory = require('../models/ReadingHistory');

async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) return null;
  const [downloads, readingHistory] = await Promise.all([
    Download.findByUser(userId),
    ReadingHistory.findByUser(userId),
  ]);
  return { ...User.toPublic(user), downloads, readingHistory };
}

module.exports = { getProfile };
