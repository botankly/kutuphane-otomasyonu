import { Router } from 'express';
import { Role } from '../types/roles';
import {
  getBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook
} from '../controllers/book.controller';
import { createReview, getBookReviews } from '../controllers/review.controller';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Public endpoints
router.get('/', getBooks);
router.get('/:id', getBookById);
router.get('/:id/reviews', getBookReviews);

// Protected Member & Staff endpoints
router.post('/:id/reviews', authenticateToken, createReview);

// Protected Staff endpoints (ADMIN & LIBRARIAN)
router.post('/', authenticateToken, requireRole(Role.ADMIN, Role.LIBRARIAN), createBook);
router.put('/:id', authenticateToken, requireRole(Role.ADMIN, Role.LIBRARIAN), updateBook);

// Protected Staff endpoints (ADMIN only)
router.delete('/:id', authenticateToken, requireRole(Role.ADMIN), deleteBook);

export default router;
