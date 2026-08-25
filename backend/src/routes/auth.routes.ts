import { Router } from 'express';
import { register, login, getMe, updateProfile, changePassword } from '../controllers/auth.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/me', authenticateToken, getMe);
router.put('/profile', authenticateToken, updateProfile);
router.put('/change-password', authenticateToken, changePassword);

export default router;
