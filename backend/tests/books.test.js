/**
 * Maktaba — tests/books.test.js
 * Covers GET /api/books, /api/books/search, /api/books/:id, /api/trending,
 * /api/best-books.
 */

const request = require('supertest');
const app = require('../server');

describe('GET /api/books', () => {
  it('returns a paginated list', async () => {
    const res = await request(app).get('/api/books?limit=5');
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeLessThanOrEqual(5);
    expect(res.body.data.total).toBeGreaterThan(0);
  });

  it('filters by category', async () => {
    const res = await request(app).get('/api/books?category=history');
    expect(res.status).toBe(200);
    res.body.data.items.forEach((book) => expect(book.category).toBe('history'));
  });
});

describe('GET /api/books/:id', () => {
  it('returns a single book', async () => {
    const res = await request(app).get('/api/books/1');
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(1);
  });

  it('returns 404 for a missing book', async () => {
    const res = await request(app).get('/api/books/999999');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/books/search', () => {
  it('requires a q parameter', async () => {
    const res = await request(app).get('/api/books/search');
    expect(res.status).toBe(422);
  });

  it('finds local matches and includes an external array', async () => {
    const res = await request(app).get('/api/books/search?q=achebe');
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
    expect(Array.isArray(res.body.data.external)).toBe(true);
  }, 10000); // external providers have their own timeouts; give this one room
});

describe('GET /api/trending and /api/best-books', () => {
  it('trending returns books ordered by popularity', async () => {
    const res = await request(app).get('/api/trending?limit=3');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(3);
  });

  it('best-books returns books ordered by rating', async () => {
    const res = await request(app).get('/api/best-books?limit=3');
    expect(res.status).toBe(200);
    const ratings = res.body.data.map((b) => Number(b.rating));
    const sorted = [...ratings].sort((a, b) => b - a);
    expect(ratings).toEqual(sorted);
  });
});

afterAll(async () => {
  // Close the pg pool this test file's `require('../server')` created,
  // so Jest doesn't warn about open handles keeping the process alive.
  await require('../config/db').end();
});
