/**
 * Maktaba — models/Download.js
 * PostgreSQL-backed download records. A download should only be created
 * once its linked payment has succeeded (enforced in the controller/
 * service layer, not here).
 */

const pool = require('../config/db');

async function create({ userId, bookId, paymentId }) {
  const result = await pool.query(
    `INSERT INTO downloads (user_id, book_id, payment_id) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, book_id) DO UPDATE SET payment_id = EXCLUDED.payment_id
     RETURNING *`,
    [userId, bookId, paymentId]
  );
  return result.rows[0];
}

async function findByUser(userId) {
  const result = await pool.query(
    `SELECT d.*, b.title, b.author FROM downloads d
     JOIN books b ON b.id = d.book_id
     WHERE d.user_id = $1 ORDER BY d.downloaded_at DESC`,
    [userId]
  );
  return result.rows;
}

async function hasUserPaidForBook(userId, bookId) {
  const result = await pool.query(
    'SELECT 1 FROM downloads WHERE user_id = $1 AND book_id = $2',
    [userId, bookId]
  );
  return result.rowCount > 0;
}

module.exports = { create, findByUser, hasUserPaidForBook };
