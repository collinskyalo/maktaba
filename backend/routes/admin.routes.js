/**
 * Maktaba — routes/admin.routes.js
 * Every route here requires a logged-in admin (requireAuth + requireAdmin).
 * Mounted at /api/admin in server.js.
 *
 *   GET    /api/admin/analytics
 *   GET    /api/admin/users
 *   GET    /api/admin/payments
 *   GET    /api/admin/books
 *   POST   /api/admin/books
 *   PUT    /api/admin/books/:id
 *   DELETE /api/admin/books/:id
 */

const express = require('express');
const adminController = require('../controllers/adminController');
const validate = require('../middleware/validateRequest');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/analytics', adminController.analytics);
router.get('/users', adminController.listUsers);
router.get('/payments', adminController.listPayments);

router.get('/books', adminController.listBooks);
router.post('/books', validate(adminController.validateBookBody), adminController.createBook);
router.put('/books/:id', adminController.updateBook);
router.delete('/books/:id', adminController.deleteBook);

module.exports = router;
