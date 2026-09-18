/**
 * Maktaba — tests/payments.test.js
 * Covers POST /api/payments/stkpush, POST /api/payments/callback, and
 * GET /api/books/:id/download — the full mocked-Daraja-to-download-gate
 * chain from Phase 10.
 */

const request = require('supertest');
const app = require('../server');

async function loginAsAsha() {
  const res = await request(app).post('/api/auth/login').send({ email: 'asha@example.com', password: 'supersecret1' });
  return res.body.data.token;
}

describe('POST /api/payments/stkpush', () => {
  it('requires authentication', async () => {
    const res = await request(app).post('/api/payments/stkpush').send({ phoneNumber: '254712345678', bookId: 2 });
    expect(res.status).toBe(401);
  });

  it('rejects an invalid phone number', async () => {
    const token = await loginAsAsha();
    const res = await request(app)
      .post('/api/payments/stkpush')
      .set('Authorization', `Bearer ${token}`)
      .send({ phoneNumber: '0712345678', bookId: 2 });
    expect(res.status).toBe(422);
  });

  it('creates a pending mocked payment (no Daraja credentials in this environment)', async () => {
    const token = await loginAsAsha();
    const res = await request(app)
      .post('/api/payments/stkpush')
      .set('Authorization', `Bearer ${token}`)
      .send({ phoneNumber: '254712345678', bookId: 2 });
    expect(res.status).toBe(202);
    expect(res.body.data.mocked).toBe(true);
    expect(res.body.data.payment.status).toBe('pending');
  });
});

describe('GET /api/books/:id/download', () => {
  it('returns 402 before any payment exists', async () => {
    const token = await loginAsAsha();
    const res = await request(app).get('/api/books/6/download').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(402);
  });

  it('unlocks after a simulated successful Daraja callback', async () => {
    const token = await loginAsAsha();

    // Simulate a real STK Push having been sent (normally darajaService does this).
    const pool = require('../config/db');
    await pool.query(
      `INSERT INTO payments (user_id, amount, book_id, checkout_request_id, status) VALUES (1, 5.00, 6, 'ws_CO_JEST_TEST', 'pending')`
    );

    const callbackRes = await request(app).post('/api/payments/callback').send({
      Body: {
        stkCallback: {
          MerchantRequestID: 'merchant-jest',
          CheckoutRequestID: 'ws_CO_JEST_TEST',
          ResultCode: 0,
          ResultDesc: 'Success',
          CallbackMetadata: { Item: [{ Name: 'MpesaReceiptNumber', Value: 'JESTRECEIPT1' }] },
        },
      },
    });
    expect(callbackRes.status).toBe(200);

    const downloadRes = await request(app).get('/api/books/6/download').set('Authorization', `Bearer ${token}`);
    // Book 6 has no pdf_url in the seed data, so a completed payment
    // correctly produces "no file available" rather than "payment required".
    expect(downloadRes.status).toBe(404);
    expect(downloadRes.body.error.message).toMatch(/no downloadable file/i);
  });
});

afterAll(async () => {
  // Close the pg pool this test file's `require('../server')` created,
  // so Jest doesn't warn about open handles keeping the process alive.
  await require('../config/db').end();
});
