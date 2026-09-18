/**
 * Maktaba — routes/users.routes.js
 * GET /api/users/profile
 */

const express = require('express');
const usersController = require('../controllers/usersController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/profile', requireAuth, usersController.profile);

module.exports = router;
