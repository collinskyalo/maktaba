/**
 * Maktaba — services/darajaService.js
 * Safaricom Daraja API (M-Pesa STK Push) integration.
 *
 * STATUS: fully implemented, but untested against a live Daraja sandbox —
 * there are no valid credentials in this environment, and none are
 * hardcoded here (see config/env.js, which reads them from process.env /
 * .env). Every function below degrades to a clearly-labeled mock when
 * `credentialsConfigured()` is false, so the rest of the app (payment
 * records, the frontend modal, the download gate) is fully testable
 * without real credentials. Once real sandbox/production credentials are
 * set, the real branches below take over with no other code changes.
 *
 * Flow:
 *   1. initiateSTKPush() gets an OAuth token, then asks Safaricom to push
 *      an STK prompt to the payer's phone, and records a `pending` payment
 *      tagged with Safaricom's CheckoutRequestID.
 *   2. The payer approves/enters their M-Pesa PIN on their phone.
 *   3. Safaricom POSTs the result to MPESA_CALLBACK_URL (routes/payments.routes.js
 *      → POST /api/payments/callback → handleCallback() below), which
 *      marks the payment completed/failed and, on success, unlocks the
 *      download (models/Download.js).
 *   4. If the callback is ever missed, verifyTransaction() can poll
 *      Safaricom's STK Push Query endpoint for the same CheckoutRequestID.
 */

const env = require('../config/env');
const Payment = require('../models/Payment');
const Download = require('../models/Download');
const logger = require('../utils/logger');

const BASE_URL = env.mpesa.baseUrl || 'https://sandbox.safaricom.co.ke';

function credentialsConfigured() {
  return Boolean(env.mpesa.consumerKey && env.mpesa.consumerSecret && env.mpesa.shortcode && env.mpesa.passkey);
}

/** YYYYMMDDHHmmss in the local timezone, as Daraja requires. */
function darajaTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

function darajaPassword(timestamp) {
  return Buffer.from(`${env.mpesa.shortcode}${env.mpesa.passkey}${timestamp}`).toString('base64');
}

/** Exchanges consumerKey/consumerSecret for a short-lived OAuth token. */
async function getAccessToken() {
  if (!credentialsConfigured()) {
    throw new Error('Daraja credentials are not configured yet.');
  }
  const basicAuth = Buffer.from(`${env.mpesa.consumerKey}:${env.mpesa.consumerSecret}`).toString('base64');
  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${basicAuth}` },
  });
  if (!res.ok) {
    throw new Error(`Daraja OAuth request failed with status ${res.status}`);
  }
  const data = await res.json();
  return data.access_token;
}

/**
 * Initiates an STK Push for a KSh 5 book download. Until real credentials
 * exist, creates a `pending` payment record and returns a clearly-labeled
 * mock response so the rest of the payment flow has something real to
 * work against.
 */
async function initiateSTKPush({ userId, phoneNumber, bookId, amount }) {
  if (!credentialsConfigured()) {
    const payment = await Payment.create({ userId, amount, bookId, status: 'pending' });
    return {
      mocked: true,
      message: 'Daraja credentials are not configured yet — this is a placeholder response for development.',
      payment,
    };
  }

  const accessToken = await getAccessToken();
  const timestamp = darajaTimestamp();
  const password = darajaPassword(timestamp);

  const body = {
    BusinessShortCode: env.mpesa.shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: amount,
    PartyA: phoneNumber,
    PartyB: env.mpesa.shortcode,
    PhoneNumber: phoneNumber,
    CallBackURL: env.mpesa.callbackUrl,
    AccountReference: `MAKTABA-BOOK-${bookId}`,
    TransactionDesc: 'Maktaba book download',
  };

  const res = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();

  if (!res.ok || data.ResponseCode !== '0') {
    throw new Error(data.errorMessage || data.ResponseDescription || 'STK Push request was rejected by Daraja.');
  }

  const payment = await Payment.create({
    userId,
    amount,
    bookId,
    status: 'pending',
    checkoutRequestId: data.CheckoutRequestID,
    merchantRequestId: data.MerchantRequestID,
  });

  return { mocked: false, message: 'Check your phone to complete the M-Pesa payment.', payment };
}

/**
 * Handles Safaricom's callback POST to MPESA_CALLBACK_URL. Safaricom's
 * payload shape: { Body: { stkCallback: { MerchantRequestID,
 * CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } } }.
 * On success (ResultCode === 0), marks the payment completed and unlocks
 * the download; otherwise marks it failed.
 */
async function handleCallback(payload) {
  const stkCallback = payload?.Body?.stkCallback;
  if (!stkCallback) {
    throw new Error('Unrecognized Daraja callback payload shape.');
  }

  const { CheckoutRequestID, ResultCode, CallbackMetadata } = stkCallback;
  const payment = await Payment.findByCheckoutRequestId(CheckoutRequestID);
  if (!payment) {
    logger.warn(`Daraja callback for unknown CheckoutRequestID ${CheckoutRequestID}`);
    return { handled: false };
  }

  if (Number(ResultCode) === 0) {
    const items = CallbackMetadata?.Item || [];
    const receipt = items.find((i) => i.Name === 'MpesaReceiptNumber')?.Value || null;

    await Payment.updateStatus(payment.id, 'completed', receipt);
    if (payment.book_id) {
      await Download.create({ userId: payment.user_id, bookId: payment.book_id, paymentId: payment.id });
    }
  } else {
    await Payment.updateStatus(payment.id, 'failed');
  }

  return { handled: true };
}

/**
 * Polls Safaricom's STK Push Query endpoint for a CheckoutRequestID whose
 * callback may have been missed. Falls back to the locally-stored status
 * when Daraja isn't configured, so the frontend's status-polling UI
 * keeps working in development.
 */
async function verifyTransaction(checkoutRequestId) {
  const payment = await Payment.findByCheckoutRequestId(checkoutRequestId);
  if (!payment) throw new Error('No payment found for that checkout request.');

  if (!credentialsConfigured()) {
    return { status: payment.status, mocked: true };
  }

  const accessToken = await getAccessToken();
  const timestamp = darajaTimestamp();
  const password = darajaPassword(timestamp);

  const res = await fetch(`${BASE_URL}/mpesa/stkpushquery/v1/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      BusinessShortCode: env.mpesa.shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    }),
  });
  const data = await res.json();

  // ResultCode 0 = paid; anything else that isn't "still processing" = failed.
  if (data.ResultCode === '0') {
    await Payment.updateStatus(payment.id, 'completed');
    if (payment.book_id) {
      await Download.create({ userId: payment.user_id, bookId: payment.book_id, paymentId: payment.id });
    }
    return { status: 'completed', mocked: false };
  }
  if (data.ResultCode && data.ResultCode !== '1032') {
    await Payment.updateStatus(payment.id, 'failed');
    return { status: 'failed', mocked: false };
  }
  return { status: 'pending', mocked: false };
}

module.exports = { getAccessToken, initiateSTKPush, handleCallback, verifyTransaction, credentialsConfigured };
