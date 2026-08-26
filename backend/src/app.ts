import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import bookRoutes from './routes/book.routes';
import loanRoutes from './routes/loan.routes';
import notificationRoutes from './routes/notification.routes';
import reservationRoutes from './routes/reservation.routes';
import statsRoutes from './routes/stats.routes';
import deskReservationRoutes from './routes/deskReservation.routes';
import adminUserRoutes from './routes/adminUser.routes';
import studyRoomRoutes from './routes/studyRoom.routes';

dotenv.config();

const app = express();

// Enable CORS for all origins (Vercel frontend, mobile apps, local dev)
app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, origin || true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
  })
);

app.options('*', cors());

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/desks', deskReservationRoutes);
app.use('/api/study-rooms', studyRoomRoutes);
app.use('/api/admin', adminUserRoutes);

// Health / Test Endpoints
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Kütüphane Otomasyonu Backend API Online',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Kütüphane Otomasyonu Backend Çalışıyor!',
    timestamp: new Date().toISOString()
  });
});

export default app;
