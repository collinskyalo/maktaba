/**
 * Maktaba — controllers/adminController.js
 * Everything behind requireAuth + requireAdmin (see routes/admin.routes.js):
 * book management, user/payment visibility, and basic analytics.
 */

const Book = require('../models/Book');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Download = require('../models/Download');
const pool = require('../config/db');
const { ok, fail } = require('../utils/response');


function validateBookBody(body) {
  const errors = [];
  if (!body.title || !body.title.trim()) errors.push('Title is required.');
  if (!body.author || !body.author.trim()) errors.push('Author is required.');
  if (!body.category || !body.category.trim()) errors.push('Category is required.');
  return errors;
}

// --- Books -------------------------------------------------------------

async function listBooks(req, res, next) {
  try {
    const { category, sort, page, limit } = req.query;
    const result = await Book.findAll({ category, sort, page: page || 1, limit: limit || 50 });
    return ok(res, result);
  } catch (err) {
    return next(err);
  }
}

async function createBook(req, res, next) {
  try {
    const book = await Book.create(req.body);
    return ok(res, book, 201);
  } catch (err) {
    return next(err);
  }
}

async function updateBook(req, res, next) {
  try {
    const book = await Book.update(req.params.id, req.body);
    if (!book) return fail(res, 'Book not found', 404);
    return ok(res, book);
  } catch (err) {
    return next(err);
  }
}

async function deleteBook(req, res, next) {
  try {
    const deleted = await Book.remove(req.params.id);
    if (!deleted) return fail(res, 'Book not found', 404);
    return ok(res, { deleted: true });
  } catch (err) {
    return next(err);
  }
}

// --- Users & payments (read-only) --------------------------------------

async function listUsers(req, res, next) {
  try {
    const result = await User.listAll({ page: req.query.page, limit: req.query.limit });
    return ok(res, result);
  } catch (err) {
    return next(err);
  }
}

async function listPayments(req, res, next) {
  try {
    const result = await Payment.listAllWithDetails({ page: req.query.page, limit: req.query.limit });
    return ok(res, result);
  } catch (err) {
    return next(err);
  }
}

// --- Analytics -----------------------------------------------------------

async function analytics(req, res, next) {
  try {
    const [userCount, bookCount, downloadCount, revenue, topBooks] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM books'),
      pool.query('SELECT COUNT(*) FROM downloads'),
      Payment.totalRevenue(),
      Book.getTrending(5),
    ]);

    return ok(res, {
      totalUsers: Number(userCount.rows[0].count),
      totalBooks: Number(bookCount.rows[0].count),
      totalDownloads: Number(downloadCount.rows[0].count),
      totalRevenueKsh: revenue,
      topBooks,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listBooks, createBook, updateBook, deleteBook,
  listUsers, listPayments, analytics, validateBookBody,
};
