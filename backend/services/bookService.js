/**
 * Maktaba — services/bookService.js
 * Thin business-logic layer over models/Book.js, plus (Phase 8) merging
 * in external provider results for search specifically.
 */

const Book = require('../models/Book');
const searchService = require('./searchService');

async function listBooks(query) {
  return Book.findAll(query);
}

/**
 * Local-catalog results come first and are authoritative (they're the
 * books Maktaba can actually let someone read/download). External
 * results are returned alongside them, clearly separated, as pointers
 * out to their original public-domain/licensed source.
 */
async function searchBooks(query) {
  const [local, external] = await Promise.all([
    Book.findAll(query),
    query.q ? searchService.searchExternalProviders(query.q) : Promise.resolve([]),
  ]);
  return { ...local, external };
}

async function getBookById(id) {
  return Book.findById(id);
}

async function trending(limit) {
  return Book.getTrending(limit);
}

async function bestBooks(limit) {
  return Book.getBestBooks(limit);
}

async function recentlyAdded(limit) {
  return Book.getRecentlyAdded(limit);
}

module.exports = { listBooks, searchBooks, getBookById, trending, bestBooks, recentlyAdded };
