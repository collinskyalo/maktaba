/**
 * Maktaba — models/Payment.js
 * PostgreSQL-backed payment records. Written to by the Daraja STK Push
 * flow (see services/darajaService.js) and updated by its callback
 * handler once Safaricom confirms the transaction.
 */

const pool = require('../config/db');

async function create({ userId, amount, bookId = null, checkoutRequestId = null, merchantRequestId = null, mpesaReceipt = null, status = 'pending' }) {
  const result = await pool.query(
    `INSERT INTO payments (user_id, amount, book_id, checkout_request_id, merchant_request_id, mpesa_receipt, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [userId, amount, bookId, checkoutRequestId, merchantRequestId, mpesaReceipt, status]
  );
  return result.rows[0];
}

async function updateStatus(id, status, mpesaReceipt = null) {
  const result = await pool.query(
    `UPDATE payments SET status = $2, mpesa_receipt = COALESCE($3, mpesa_receipt)
     WHERE id = $1 RETURNING *`,
    [id, status, mpesaReceipt]
  );
  return result.rows[0] || null;
}

async function findById(id) {
  const result = await pool.query('SELECT * FROM payments WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function findByCheckoutRequestId(checkoutRequestId) {
  const result = await pool.query('SELECT * FROM payments WHERE checkout_request_id = $1', [checkoutRequestId]);
  return result.rows[0] || null;
}

async function findByUser(userId) {
  const result = await pool.query('SELECT * FROM payments WHERE user_id = $1 ORDER BY transaction_date DESC', [userId]);
  return result.rows;
}

/** Admin (Phase 11): all payments with the user's name/email and the book's title joined in. */
async function listAllWithDetails({ page = 1, limit = 50 } = {}) {
  const offset = (Number(page) - 1) * Number(limit);
  const [itemsResult, countResult] = await Promise.all([
    pool.query(
      `SELECT p.*, u.name AS user_name, u.email AS user_email, b.title AS book_title
       FROM payments p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN books b ON b.id = p.book_id
       ORDER BY p.transaction_date DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    ),
    pool.query('SELECT COUNT(*) FROM payments'),
  ]);
  return { items: itemsResult.rows, total: Number(countResult.rows[0].count), page: Number(page), limit: Number(limit) };
}

/** Admin (Phase 11): total revenue from completed payments, in KSh. */
async function totalRevenue() {
  const result = await pool.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE status = 'completed'`);
  return Number(result.rows[0].total);
}

module.exports = { create, updateStatus, findById, findByCheckoutRequestId, findByUser, listAllWithDetails, totalRevenue };
