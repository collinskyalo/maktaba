/**
 * Maktaba — models/PasswordReset.js
 * Backs the forgot-password / reset-password flow. Only a hash of the
 * reset token is ever stored — the raw token is emailed to the user and
 * never persisted (see services/emailService.js).
 */

const pool = require('../config/db');

async function create({ userId, tokenHash, expiresAt }) {
  const result = await pool.query(
    'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3) RETURNING *',
    [userId, tokenHash, expiresAt]
  );
  return result.rows[0];
}

async function findValidByTokenHash(tokenHash) {
  const result = await pool.query(
    `SELECT * FROM password_resets
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
     ORDER BY created_at DESC LIMIT 1`,
    [tokenHash]
  );
  return result.rows[0] || null;
}

async function markUsed(id) {
  await pool.query('UPDATE password_resets SET used_at = now() WHERE id = $1', [id]);
}

module.exports = { create, findValidByTokenHash, markUsed };
