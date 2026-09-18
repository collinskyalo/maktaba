/**
 * Maktaba — tests/admin.test.js
 * Covers the requireAdmin guard and basic book CRUD from Phase 11.
 */

const request = require('supertest');
const app = require('../server');

async function loginAs(email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.data.token;
}

describe('Admin guard', () => {
  it('rejects requests with no token', async () => {
    const res = await request(app).get('/api/admin/analytics');
    expect(res.status).toBe(401);
  });

  it('rejects a logged-in non-admin with 403', async () => {
    const token = await loginAs('asha@example.com', 'supersecret1');
    const res = await request(app).get('/api/admin/analytics').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('allows the seeded admin account', async () => {
    const token = await loginAs('admin@maktaba.co.ke', 'adminpass123');
    const res = await request(app).get('/api/admin/analytics').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.totalBooks).toBeGreaterThan(0);
  });
});

describe('Admin book management', () => {
  let token;
  beforeAll(async () => {
    token = await loginAs('admin@maktaba.co.ke', 'adminpass123');
  });

  it('creates, updates, and deletes a book', async () => {
    const createRes = await request(app)
      .post('/api/admin/books')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Jest Test Book', author: 'Jest', category: 'fiction' });
    expect(createRes.status).toBe(201);
    const id = createRes.body.data.id;

    const updateRes = await request(app)
      .put(`/api/admin/books/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ pdfUrl: 'https://example.com/fixed.pdf', featured: true });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.pdf_url).toBe('https://example.com/fixed.pdf');
    expect(updateRes.body.data.featured).toBe(true);

    const deleteRes = await request(app).delete(`/api/admin/books/${id}`).set('Authorization', `Bearer ${token}`);
    expect(deleteRes.status).toBe(200);

    const getRes = await request(app).get(`/api/books/${id}`);
    expect(getRes.status).toBe(404);
  });

  it('rejects a book with no title/author/category', async () => {
    const res = await request(app).post('/api/admin/books').set('Authorization', `Bearer ${token}`).send({});
    expect(res.status).toBe(422);
  });
});

afterAll(async () => {
  // Close the pg pool this test file's `require('../server')` created,
  // so Jest doesn't warn about open handles keeping the process alive.
  await require('../config/db').end();
});
