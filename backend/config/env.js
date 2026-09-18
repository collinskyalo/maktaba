/**
 * Maktaba — config/env.js
 * Loads environment variables once and exposes them as a typed-ish config
 * object so the rest of the app never touches process.env directly.
 */

require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',

  databaseUrl: process.env.DATABASE_URL || '',
  sqlitePath: process.env.SQLITE_PATH || './database/maktaba.sqlite',

  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 10,

  // Comma-separated list of allowed frontend origins in production, e.g.
  // "https://maktaba.co.ke,https://www.maktaba.co.ke". Left unset (undefined)
  // in development, which the cors() call in server.js treats as "allow any
  // origin" — convenient locally, but ALWAYS set this in production.
  corsOrigins: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map((s) => s.trim()) : undefined,

  // Safaricom Daraja — read here, used only inside services/darajaService.js.
  // Never logged, never sent to the frontend.
  mpesa: {
    baseUrl: process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke',
    consumerKey: process.env.MPESA_CONSUMER_KEY || '',
    consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
    shortcode: process.env.MPESA_SHORTCODE || '',
    passkey: process.env.MPESA_PASSKEY || '',
    callbackUrl: process.env.MPESA_CALLBACK_URL || '',
  },

  googleBooksApiKey: process.env.GOOGLE_BOOKS_API_KEY || '',
};
