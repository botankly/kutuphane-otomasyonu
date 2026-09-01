import { Router } from 'express';
import {
  getRooms,
  getDeskAvailability,
  createDeskReservation,
  getUserDeskReservations,
  cancelDeskReservation,
  checkInDeskReservation,
  checkOutDeskReservation,
  addDeskByAdmin,
  deleteDeskByAdmin,
  updateDeskByAdmin
} from '../controllers/deskReservation.controller';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Public / General Endpoints
router.get('/rooms', getRooms);
router.get('/availability', getDeskAvailability);

// Authenticated User Endpoints
router.post('/reserve', authenticateToken, createDeskReservation);
router.get('/my-reservations', authenticateToken, getUserDeskReservations);
router.patch('/reservations/:id/cancel', authenticateToken, cancelDeskReservation);
router.post('/reservations/:id/check-in', authenticateToken, checkInDeskReservation);
router.post('/reservations/:id/check-out', authenticateToken, checkOutDeskReservation);

// Admin / Staff Management Endpoints
router.post('/', authenticateToken, requireRole('ADMIN', 'LIBRARIAN'), addDeskByAdmin);
router.delete('/:id', authenticateToken, requireRole('ADMIN', 'LIBRARIAN'), deleteDeskByAdmin);
router.post('/admin/add', authenticateToken, requireRole('ADMIN', 'LIBRARIAN'), addDeskByAdmin);
router.delete('/admin/:id', authenticateToken, requireRole('ADMIN', 'LIBRARIAN'), deleteDeskByAdmin);
router.put('/admin/:id', authenticateToken, requireRole('ADMIN', 'LIBRARIAN'), updateDeskByAdmin);

export default router;
