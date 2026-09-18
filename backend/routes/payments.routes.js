/**
 * Maktaba — routes/payments.routes.js
 * POST /api/payments/stkpush
 * POST /api/payments/callback   (Safaricom → us; see docs/DarajaIntegration.md)
 * GET  /api/payments/:id/status
 */

const express = require('express');
const paymentsController = require('../controllers/paymentsController');
const validate = require('../middleware/validateRequest');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/stkpush', requireAuth, validate(paymentsController.validateStkPushBody), paymentsController.stkPush);
router.post('/callback', paymentsController.callback);
router.get('/:id/status', requireAuth, paymentsController.status);

module.exports = router;
