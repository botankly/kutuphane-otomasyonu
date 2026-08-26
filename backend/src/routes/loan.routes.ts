import { Router } from 'express';
import { Role } from '../types/roles';
import {
  issueLoan,
  borrowBook,
  returnLoan,
  payAndReturnLoan,
  getMyLoans,
  getAllLoans
} from '../controllers/loan.controller';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Protected Member & Staff routes
router.get('/my-loans', authenticateToken, getMyLoans);
router.post('/borrow', authenticateToken, borrowBook);
router.post('/pay-and-return/:loanId', authenticateToken, payAndReturnLoan);

// Protected return route (ADMIN, LIBRARIAN or MEMBER returning their own loan)
router.post('/return/:loanId', authenticateToken, returnLoan);
router.get('/all', authenticateToken, requireRole(Role.ADMIN, Role.LIBRARIAN), getAllLoans);

export default router;
