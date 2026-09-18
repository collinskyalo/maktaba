# Maktaba — Safaricom Daraja (M-Pesa) Integration Guide

## Overview

Maktaba charges KSh 5 per book download via M-Pesa's STK Push (the prompt
that appears on the payer's phone asking them to enter their M-Pesa PIN).
All of the logic lives in `backend/services/darajaService.js` — no other
file constructs Daraja requests directly.

## Getting sandbox credentials

1. Create an account at https://developer.safaricom.co.ke
2. Create an app and note its **Consumer Key** and **Consumer Secret**.
3. Under "Lipa Na M-Pesa Online", get the sandbox **Shortcode** (default
   test shortcode: `174379`) and **Passkey**.
4. Set these in `backend/.env` (never commit this file):

```
MPESA_BASE_URL=https://sandbox.safaricom.co.ke
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_SHORTCODE=174379
MPESA_PASSKEY=...
MPESA_CALLBACK_URL=https://<your-public-url>/api/payments/callback
```

`MPESA_CALLBACK_URL` must be publicly reachable over HTTPS — Safaricom
cannot call back to `localhost`. Use a tunnel (ngrok, Cloudflare Tunnel)
during development.

## The flow

1. **Frontend** (`book-details.html`'s payment modal) calls
   `POST /api/payments/stkpush` with `{ phoneNumber, bookId }`.
2. **Backend** (`paymentsController.stkPush` → `darajaService.initiateSTKPush`):
   - Exchanges `MPESA_CONSUMER_KEY`/`SECRET` for an OAuth token
     (`GET /oauth/v1/generate`).
   - Builds the STK Push request (`Password` is
     `base64(shortcode + passkey + timestamp)`) and POSTs it to
     `/mpesa/stkpush/v1/processrequest`.
   - Records a `pending` row in `payments`, tagged with Safaricom's
     `CheckoutRequestID` so the callback can find it later.
3. The payer's phone shows the STK prompt; they enter their PIN.
4. **Safaricom** POSTs the result to `MPESA_CALLBACK_URL`
   (`POST /api/payments/callback` → `darajaService.handleCallback`):
   - On success (`ResultCode === 0`): marks the payment `completed`,
     stores the M-Pesa receipt number, and creates a row in `downloads`
     — this is what "unlocks" the book.
   - On failure/cancellation: marks the payment `failed`.
   - This endpoint always responds `200` (Safaricom expects that, even if
     something went wrong on our end — otherwise it keeps retrying).
5. If the callback is ever missed (e.g. tunnel dropped), the frontend
   polls `GET /api/payments/:id/status`, which falls back to Safaricom's
   STK Push Query endpoint (`darajaService.verifyTransaction`) so the
   payment doesn't get stuck showing "pending" forever.
6. Once a payment is `completed`, `GET /api/books/:id/download` (guarded
   by `Download.hasUserPaidForBook`) returns the real `pdf_url`.

## What's real vs. mocked right now

Every function above is fully implemented against Daraja's actual API
shape. What's still a placeholder is **credentials** — there are none
configured in this environment, so `credentialsConfigured()` is `false`
and `initiateSTKPush()` takes its mock branch: it still creates a real
`pending` payment row (so the rest of the app has something to work
against), but tells the frontend plainly that nothing was actually sent
to Safaricom. Set the four `MPESA_*` variables above and every mock
branch is bypassed automatically — no code changes needed.

## Testing without a public callback URL

Safaricom's sandbox lets you skip waiting for a live phone: after
calling `stkpush`, you can call the STK Push Query endpoint directly
(what `verifyTransaction()` does) to check status, or simulate a
callback by POSTing a Safaricom-shaped payload straight to
`POST /api/payments/callback` yourself for local testing.
