import { Router } from 'express';
import {
  getAllUsers,
  getUserDetails,
  toggleUserStatus,
  deleteUserByAdmin
} from '../controllers/adminUser.controller';
import { getAnalytics } from '../controllers/stats.controller';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Admin / Librarian only endpoints
router.get('/stats', authenticateToken, requireRole('ADMIN', 'LIBRARIAN'), getAnalytics);
router.get('/users', authenticateToken, requireRole('ADMIN', 'LIBRARIAN'), getAllUsers);
router.get('/users/:id/details', authenticateToken, requireRole('ADMIN', 'LIBRARIAN'), getUserDetails);
router.patch('/users/:id/status', authenticateToken, requireRole('ADMIN', 'LIBRARIAN'), toggleUserStatus);
router.delete('/users/:id', authenticateToken, requireRole('ADMIN', 'LIBRARIAN'), deleteUserByAdmin);

export default router;

