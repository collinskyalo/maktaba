/**
 * Maktaba — models/User.js
 * PostgreSQL-backed user store. Passwords are always stored already-hashed
 * — hashing happens in authController, not here.
 */

const pool = require('../config/db');

async function findByEmail(email) {
  const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
  return result.rows[0] || null;
}

async function findById(id) {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function create({ name, email, passwordHash }) {
  const result = await pool.query(
    'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING *',
    [name, email, passwordHash]
  );
  return result.rows[0];
}

async function updatePasswordHash(id, passwordHash) {
  const result = await pool.query(
    'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING *',
    [passwordHash, id]
  );
  return result.rows[0] || null;
}

/** Admin (Phase 11): list all users, most recent first. Never includes password_hash. */
async function listAll({ page = 1, limit = 50 } = {}) {
  const offset = (Number(page) - 1) * Number(limit);
  const [itemsResult, countResult] = await Promise.all([
    pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]),
    pool.query('SELECT COUNT(*) FROM users'),
  ]);
  return { items: itemsResult.rows, total: Number(countResult.rows[0].count), page: Number(page), limit: Number(limit) };
}

/** Returns a copy of the user without the password hash, safe to send to the client. */
function toPublic(user) {
  if (!user) return null;
  const { password_hash, ...publicUser } = user; // eslint-disable-line no-unused-vars
  return publicUser;
}

module.exports = { findByEmail, findById, create, updatePasswordHash, listAll, toPublic };
