/**
 * Maktaba — config/db.js
 * PostgreSQL connection pool.
 *
 * Phase 6 (Database) will run schema.sql/seed.sql against this pool and
 * switch the models in backend/models/ from in-memory arrays to real
 * queries through `pool.query(...)`. The pool is created eagerly but
 * lazily connects — it is safe to require this file even before a
 * database exists, which is what the current in-memory models do (they
 * do not import this file yet).
 */

const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  connectionString: env.databaseUrl || undefined,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error on idle client', err);
});

module.exports = pool;
