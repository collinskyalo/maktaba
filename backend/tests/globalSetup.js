/**
 * Maktaba — tests/globalSetup.js
 * Runs ONCE before the whole test suite (Jest's `globalSetup`, a separate
 * process from the test files themselves). (Re)creates the test database
 * from a clean slate and loads schema.sql + seed.sql, so every test run
 * starts from the same known data — the same seeded users, books, and
 * payments described in README.md.
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const TEST_DB_URL = process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/maktaba_test';
const TEST_DB_NAME = new URL(TEST_DB_URL).pathname.replace('/', '');
const ADMIN_URL = TEST_DB_URL.replace(`/${TEST_DB_NAME}`, '/postgres');

module.exports = async function globalSetup() {
  const adminPool = new Pool({ connectionString: ADMIN_URL });
  try {
    await adminPool.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${TEST_DB_NAME}' AND pid <> pg_backend_pid()`);
    await adminPool.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);
    await adminPool.query(`CREATE DATABASE ${TEST_DB_NAME}`);
  } finally {
    await adminPool.end();
  }

  const testPool = new Pool({ connectionString: TEST_DB_URL });
  try {
    const schema = fs.readFileSync(path.join(__dirname, '../../database/schema.sql'), 'utf8');
    const seed = fs.readFileSync(path.join(__dirname, '../../database/seed.sql'), 'utf8');
    await testPool.query(schema);
    await testPool.query(seed);
  } finally {
    await testPool.end();
  }
};
