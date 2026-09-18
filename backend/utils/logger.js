/**
 * Maktaba — utils/logger.js
 * Minimal console-based logger. Swap for winston/pino later if needed —
 * every call site here goes through this module, not console.* directly.
 */

const logger = {
  info: (...args) => console.log('[info]', ...args),
  warn: (...args) => console.warn('[warn]', ...args),
  error: (...args) => console.error('[error]', ...args),
};

module.exports = logger;
