/**
 * Maktaba — utils/response.js
 * Tiny helpers so every controller returns JSON in the same shape.
 */

function ok(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

function fail(res, message, status = 400, details = undefined) {
  return res.status(status).json({ success: false, error: { message, details } });
}

module.exports = { ok, fail };
