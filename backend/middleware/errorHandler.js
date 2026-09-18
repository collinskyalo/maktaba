/**
 * Maktaba — middleware/errorHandler.js
 * Centralized error handler. Any controller can `next(err)` (or an async
 * route can throw, caught by the wrapper in utils via try/catch) and it
 * lands here instead of leaking a stack trace to the client.
 */

const logger = require('../utils/logger');
const { fail } = require('../utils/response');
const env = require('../config/env');

function notFoundHandler(req, res) {
  return fail(res, `Route ${req.method} ${req.originalUrl} not found`, 404);
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  logger.error(err);
  const status = err.status || 500;
  const message = status === 500 && env.nodeEnv === 'production'
    ? 'Something went wrong'
    : err.message;
  return fail(res, message, status);
}

module.exports = { notFoundHandler, errorHandler };
