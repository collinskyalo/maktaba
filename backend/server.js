/**
 * Maktaba — backend/server.js
 * Express application entry point: security middleware, route mounting,
 * and centralized error handling.
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const env = require('./config/env');
const logger = require('./utils/logger');
const pool = require('./config/db');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const booksRoutes = require('./routes/books.routes');
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const paymentsRoutes = require('./routes/payments.routes');
const trendingRoutes = require('./routes/trending.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

// --- Security & parsing middleware ---------------------------------------
app.use(helmet());
// env.corsOrigins is undefined in development (allows any origin, which is
// what cors() with no options does) and a fixed allow-list in production —
// see FRONTEND_URL in .env.example. Never left wide open in production.
app.use(cors(env.corsOrigins ? { origin: env.corsOrigins } : undefined));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));
app.use('/api', apiLimiter);

// --- Health check ----------------------------------------------------------
// Also checks the database, not just "the process is up" — this is what a
// container orchestrator's healthcheck (see docker-compose.yml) or a load
// balancer should hit, since an app that can't reach Postgres isn't healthy
// even though the Express process itself is running fine.
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.json({ status: 'ok', env: env.nodeEnv, database: 'connected' });
  } catch (err) {
    return res.status(503).json({ status: 'degraded', env: env.nodeEnv, database: 'unreachable' });
  }
});

// --- Routes ------------------------------------------------------------
app.use('/api/books', booksRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api', trendingRoutes); // /api/trending, /api/best-books
app.use('/api/admin', adminRoutes);

// --- 404 + error handling -------------------------------------------------
app.use(notFoundHandler);
app.use(errorHandler);

// Only bind a port when this file is run directly (`node server.js` / `npm run dev`).
// Tests import `app` via module.exports and drive it with supertest instead —
// binding a real port per test file would be slow and flaky.
if (require.main === module) {
  const server = app.listen(env.port, () => {
    logger.info(`Maktaba API listening on port ${env.port} (${env.nodeEnv})`);
  });

  // Graceful shutdown: stop accepting new connections, then close the DB
  // pool, before exiting. Matters in containers, where the orchestrator
  // sends SIGTERM on every deploy/restart/scale-down.
  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down gracefully…`);
    server.close(async () => {
      await pool.end();
      logger.info('Closed out remaining connections. Exiting.');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref(); // force-exit if it hangs
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = app;
