/**
 * Maktaba — services/googleAuthService.js
 * Placeholder for "Sign in with Google" (listed as a future feature in
 * the brief). No Google OAuth client is configured yet, and none of
 * this makes a real network call.
 *
 * When ready:
 *   1. Create an OAuth 2.0 Client ID in Google Cloud Console.
 *   2. Add GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET to .env (see .env.example).
 *   3. Implement verifyIdToken() below using the `google-auth-library` package
 *      to verify the ID token the frontend receives from Google Identity Services.
 *   4. On success, find-or-create a User by email (models/User.js) and
 *      issue a normal Maktaba JWT via utils/jwt.js — the rest of the app
 *      (authMiddleware, /users/profile, etc.) does not need to know the
 *      user signed in with Google.
 */

function isConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

async function verifyIdToken(idToken) {
  if (!isConfigured()) {
    throw new Error('Google sign-in is not configured yet.');
  }
  // TODO: verify idToken with google-auth-library and return { email, name }.
  throw new Error('Google sign-in is not implemented yet.');
}

module.exports = { isConfigured, verifyIdToken };
