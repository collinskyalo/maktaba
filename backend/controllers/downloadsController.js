/**
 * Maktaba — controllers/downloadsController.js
 * GET /api/books/:id/download — the "unlock" step after a KSh 5 payment
 * completes. Only returns the real pdf_url once Download.hasUserPaidForBook
 * confirms a completed payment exists for this user + book.
 */

const Book = require('../models/Book');
const Download = require('../models/Download');
const { ok, fail } = require('../utils/response');

async function getDownloadLink(req, res, next) {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return fail(res, 'Book not found', 404);

    const hasPaid = await Download.hasUserPaidForBook(req.user.id, book.id);
    if (!hasPaid) {
      return fail(res, 'Payment required before this book can be downloaded.', 402);
    }
    if (!book.pdf_url) {
      return fail(res, 'No downloadable file is available for this book yet.', 404);
    }

    return ok(res, { downloadUrl: book.pdf_url });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getDownloadLink };
