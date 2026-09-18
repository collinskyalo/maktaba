/**
 * Maktaba — controllers/booksController.js
 * Handles GET /api/books, GET /api/books/search, GET /api/books/:id,
 * GET /api/trending, GET /api/best-books.
 */

const bookService = require('../services/bookService');
const { ok, fail } = require('../utils/response');

async function list(req, res, next) {
  try {
    const { category, sort, page, limit } = req.query;
    const result = await bookService.listBooks({ category, sort, page, limit });
    return ok(res, result);
  } catch (err) {
    return next(err);
  }
}

async function search(req, res, next) {
  try {
    const { q, category, sort, page, limit } = req.query;
    if (!q) {
      return fail(res, 'Query parameter "q" is required', 422);
    }
    const result = await bookService.searchBooks({ q, category, sort, page, limit });
    return ok(res, result);
  } catch (err) {
    return next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const book = await bookService.getBookById(req.params.id);
    if (!book) return fail(res, 'Book not found', 404);
    return ok(res, book);
  } catch (err) {
    return next(err);
  }
}

async function trending(req, res, next) {
  try {
    const books = await bookService.trending(Number(req.query.limit) || 10);
    return ok(res, books);
  } catch (err) {
    return next(err);
  }
}

async function bestBooks(req, res, next) {
  try {
    const books = await bookService.bestBooks(Number(req.query.limit) || 10);
    return ok(res, books);
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, search, getOne, trending, bestBooks };
