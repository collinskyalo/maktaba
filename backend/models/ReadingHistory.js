/**
 * Maktaba — models/ReadingHistory.js
 * PostgreSQL-backed reading history. Feeds the user's dashboard reading
 * history (and, later, a "continue reading" style feature).
 */

const pool = require('../config/db');

async function record({ userId, bookId, readTime }) {
  const result = await pool.query(
    'INSERT INTO reading_history (user_id, book_id, read_time) VALUES ($1, $2, $3) RETURNING *',
    [userId, bookId, readTime]
  );
  return result.rows[0];
}

async function findByUser(userId) {
  const result = await pool.query(
    `SELECT h.*, b.title, b.author FROM reading_history h
     JOIN books b ON b.id = h.book_id
     WHERE h.user_id = $1 ORDER BY h.id DESC`,
    [userId]
  );
  return result.rows;
}

module.exports = { record, findByUser };
