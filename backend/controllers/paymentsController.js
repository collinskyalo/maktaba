/**
 * Maktaba — controllers/paymentsController.js
 * POST /api/payments/stkpush, POST /api/payments/callback,
 * GET /api/payments/:id/status
 */

const darajaService = require('../services/darajaService');
const Payment = require('../models/Payment');
const Book = require('../models/Book');
const { ok, fail } = require('../utils/response');

function validateStkPushBody(body) {
  const errors = [];
  if (!body.phoneNumber || !/^2547\d{8}$/.test(body.phoneNumber)) {
    errors.push('phoneNumber must be a Safaricom number in the format 2547XXXXXXXX.');
  }
  if (!body.bookId) errors.push('bookId is required.');
  return errors;
}

async function stkPush(req, res, next) {
  try {
    const { phoneNumber, bookId } = req.body;

    const book = await Book.findById(bookId);
    if (!book) return fail(res, 'Book not found', 404);

    const result = await darajaService.initiateSTKPush({
      userId: req.user.id,
      phoneNumber,
      bookId,
      amount: 5, // KSh 5 per the brief — fixed, not client-supplied
    });
    return ok(res, result, 202);
  } catch (err) {
    return next(err);
  }
}

/** Safaricom → us. Always acknowledge with 200 so Daraja stops retrying, even on our own errors. */
async function callback(req, res) {
  try {
    await darajaService.handleCallback(req.body);
  } catch (err) {
    req.app.get('logger')?.error?.(err);
  }
  return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
}

/** Lets the frontend poll a pending payment (e.g. while waiting for the STK Push callback). */
async function status(req, res, next) {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment || payment.user_id !== req.user.id) return fail(res, 'Payment not found', 404);

    // If it's still pending and we have a checkout request id, ask Daraja directly
    // in case its callback never arrived.
    if (payment.status === 'pending' && payment.checkout_request_id) {
      try {
        const result = await darajaService.verifyTransaction(payment.checkout_request_id);
        return ok(res, { status: result.status, paymentId: payment.id });
      } catch (err) {
        // fall through to returning the last known local status
      }
    }

    return ok(res, { status: payment.status, paymentId: payment.id, mpesaReceipt: payment.mpesa_receipt });
  } catch (err) {
    return next(err);
  }
}

module.exports = { stkPush, callback, status, validateStkPushBody };
