import { Router } from 'express';
import { getAnalytics, getLiveOccupancy, getRiskAnalytics } from '../controllers/stats.controller';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';
import { Role } from '../types/roles';

const router = Router();

router.get('/analytics', authenticateToken, requireRole(Role.ADMIN, Role.LIBRARIAN), getAnalytics);
router.get('/live-occupancy', getLiveOccupancy);
router.get('/risk-analytics', authenticateToken, requireRole(Role.ADMIN, Role.LIBRARIAN), getRiskAnalytics);

export default router;
