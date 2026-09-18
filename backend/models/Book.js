/**
 * Maktaba — models/Book.js
 * Data access for books, backed by PostgreSQL (see ../database/schema.sql
 * for the `books` table and the `book_popularity` view this relies on).
 */

const pool = require('../config/db');

const SORT_COLUMNS = {
  recent: 'b.created_at DESC',
  rating: 'b.rating DESC',
  best: 'b.rating DESC',
  popular: 'popularity_score DESC',
};

async function findAll({ category, q, sort = 'popular', page = 1, limit = 20 } = {}) {
  const conditions = [];
  const values = [];

  if (category) {
    values.push(category);
    conditions.push(`b.category = $${values.length}`);
  }
  if (q) {
    values.push(q);
    conditions.push(`(
      to_tsvector('english', b.title || ' ' || b.author) @@ plainto_tsquery('english', $${values.length})
      OR b.isbn = $${values.length}
      OR b.category ILIKE '%' || $${values.length} || '%'
    )`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = SORT_COLUMNS[sort] || SORT_COLUMNS.popular;

  const offset = (Number(page) - 1) * Number(limit);
  values.push(Number(limit), offset);

  const itemsQuery = `
    SELECT b.*, COALESCE(p.popularity_score, b.reads) AS popularity_score
    FROM books b
    LEFT JOIN book_popularity p ON p.id = b.id
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT $${values.length - 1} OFFSET $${values.length}
  `;
  const countQuery = `SELECT COUNT(*) FROM books b ${whereClause}`;

  const [itemsResult, countResult] = await Promise.all([
    pool.query(itemsQuery, values),
    pool.query(countQuery, values.slice(0, conditions.length)),
  ]);

  return {
    items: itemsResult.rows,
    total: Number(countResult.rows[0].count),
    page: Number(page),
    limit: Number(limit),
  };
}

async function findById(id) {
  const result = await pool.query('SELECT * FROM books WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function getTrending(limit = 10) {
  const result = await pool.query(
    `SELECT b.*, p.popularity_score FROM books b
     JOIN book_popularity p ON p.id = b.id
     ORDER BY p.popularity_score DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
}

async function getBestBooks(limit = 10) {
  const result = await pool.query('SELECT * FROM books ORDER BY rating DESC LIMIT $1', [limit]);
  return result.rows;
}

async function getRecentlyAdded(limit = 10) {
  const result = await pool.query('SELECT * FROM books ORDER BY created_at DESC LIMIT $1', [limit]);
  return result.rows;
}

// --- Admin (Phase 11) -------------------------------------------------

async function create(book) {
  const result = await pool.query(
    `INSERT INTO books (title, author, isbn, synopsis, cover_url, pdf_url, category, language, publisher, pages, rating, featured)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [book.title, book.author, book.isbn || null, book.synopsis || null, book.coverUrl || null, book.pdfUrl || null,
     book.category, book.language || 'English', book.publisher || null, book.pages || null, book.rating || 0, book.featured || false]
  );
  return result.rows[0];
}

async function update(id, fields) {
  const columns = {
    title: 'title', author: 'author', isbn: 'isbn', synopsis: 'synopsis',
    coverUrl: 'cover_url', pdfUrl: 'pdf_url', category: 'category', language: 'language',
    publisher: 'publisher', pages: 'pages', rating: 'rating', featured: 'featured',
  };
  const sets = [];
  const values = [];
  Object.entries(fields).forEach(([key, value]) => {
    if (columns[key] !== undefined && value !== undefined) {
      values.push(value);
      sets.push(`${columns[key]} = $${values.length}`);
    }
  });
  if (sets.length === 0) return findById(id);

  values.push(id);
  const result = await pool.query(
    `UPDATE books SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

async function remove(id) {
  const result = await pool.query('DELETE FROM books WHERE id = $1', [id]);
  return result.rowCount > 0;
}

async function getFeatured(limit = 10) {
  const result = await pool.query('SELECT * FROM books WHERE featured = true ORDER BY created_at DESC LIMIT $1', [limit]);
  return result.rows;
}

module.exports = { findAll, findById, getTrending, getBestBooks, getRecentlyAdded, create, update, remove, getFeatured };
