import { Router } from 'express';
import {
  getAllStudyRooms,
  getUserStudyRoomReservations,
  reserveStudyRoom,
  cancelStudyRoomReservation,
  createStudyRoomByAdmin,
  updateStudyRoomByAdmin,
  deleteStudyRoomByAdmin
} from '../controllers/studyRoom.controller';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Public / Authenticated Study Room Routes
router.get('/', getAllStudyRooms);
router.get('/my-reservations', authenticateToken, getUserStudyRoomReservations);
router.post('/reserve', authenticateToken, reserveStudyRoom);
router.delete('/reservations/:id', authenticateToken, cancelStudyRoomReservation);

// Admin Study Room Management Routes
router.post('/admin/add', authenticateToken, requireRole('ADMIN', 'LIBRARIAN'), createStudyRoomByAdmin);
router.put('/admin/:id', authenticateToken, requireRole('ADMIN', 'LIBRARIAN'), updateStudyRoomByAdmin);
router.delete('/admin/:id', authenticateToken, requireRole('ADMIN', 'LIBRARIAN'), deleteStudyRoomByAdmin);

export default router;
