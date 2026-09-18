/**
 * Maktaba — routes/books.routes.js
 * GET /api/books
 * GET /api/books/search
 * GET /api/books/:id
 * GET /api/books/:id/download   (requires auth + a completed payment)
 * GET /api/trending      (mounted separately in server.js as its own prefix)
 * GET /api/best-books    (mounted separately in server.js as its own prefix)
 */

const express = require('express');
const booksController = require('../controllers/booksController');
const downloadsController = require('../controllers/downloadsController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/search', booksController.search);
router.get('/:id/download', requireAuth, downloadsController.getDownloadLink);
router.get('/:id', booksController.getOne);
router.get('/', booksController.list);

module.exports = router;
