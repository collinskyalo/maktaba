/**
 * Maktaba — routes/auth.routes.js
 * POST /api/auth/register
 * POST /api/auth/login
 * POST /api/auth/forgot-password
 * POST /api/auth/reset-password
 * POST /api/auth/google          (placeholder — see services/googleAuthService.js)
 */

const express = require('express');
const authController = require('../controllers/authController');
const validate = require('../middleware/validateRequest');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/register', authLimiter, validate(authController.validateRegisterBody), authController.register);
router.post('/login', authLimiter, validate(authController.validateLoginBody), authController.login);
router.post('/forgot-password', authLimiter, validate(authController.validateForgotPasswordBody), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate(authController.validateResetPasswordBody), authController.resetPassword);
router.post('/google', authLimiter, authController.google);

module.exports = router;
