import { Router } from 'express';
import {
  createReservation,
  getMyReservations
} from '../controllers/reservation.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.post('/', authenticateToken, createReservation);
router.get('/my-reservations', authenticateToken, getMyReservations);

export default router;
