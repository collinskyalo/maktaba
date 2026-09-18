/**
 * Maktaba — routes/trending.routes.js
 * GET /api/trending
 * GET /api/best-books
 * Split from books.routes.js because these read as top-level resources
 * in the API brief, not sub-resources of /books.
 */

const express = require('express');
const booksController = require('../controllers/booksController');

const router = express.Router();

router.get('/trending', booksController.trending);
router.get('/best-books', booksController.bestBooks);

module.exports = router;
