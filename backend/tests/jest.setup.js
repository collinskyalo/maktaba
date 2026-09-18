/**
 * Maktaba — tests/jest.setup.js
 * Runs before each test file (via Jest's `setupFiles`). Points the app at
 * the test database and a fixed JWT secret, before any test file requires
 * server.js / config/db.js — dotenv.config() never overwrites variables
 * that are already set, so these values win.
 */

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/maktaba_test';
process.env.JWT_SECRET = 'test-only-secret';
