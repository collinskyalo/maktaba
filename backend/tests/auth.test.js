/**
 * Maktaba — tests/auth.test.js
 * Covers POST /api/auth/register and /login.
 */

const request = require('supertest');
const app = require('../server');

describe('POST /api/auth/register', () => {
  it('creates a new account and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: `test-${Date.now()}@example.com`,
      password: 'supersecret1',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user.password_hash).toBeUndefined();
  });

  it('rejects a duplicate email with 409', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Duplicate',
      email: 'asha@example.com', // seeded in database/seed.sql
      password: 'supersecret1',
    });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('rejects a weak password with 422', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'A',
      email: 'not-an-email',
      password: '123',
    });
    expect(res.status).toBe(422);
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with the correct seeded password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'asha@example.com',
      password: 'supersecret1',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toEqual(expect.any(String));
  });

  it('rejects the wrong password with 401', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'asha@example.com',
      password: 'wrong-password',
    });
    expect(res.status).toBe(401);
  });

  it('rejects an unknown email with 401 (not 404 — avoids confirming which emails exist)', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@example.com',
      password: 'whatever123',
    });
    expect(res.status).toBe(401);
  });
});

afterAll(async () => {
  // Close the pg pool this test file's `require('../server')` created,
  // so Jest doesn't warn about open handles keeping the process alive.
  await require('../config/db').end();
});
