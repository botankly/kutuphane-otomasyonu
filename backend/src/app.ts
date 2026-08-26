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

// Explicit list of allowed origins for production & local development
const allowedOrigins = [
  'https://kutuphane-backend-alpha.vercel.app',
  'https://kutuphane-otomasyonu-tr.vercel.app',
  'https://frontend-beta-steel-52.vercel.app',
  'http://localhost:3000',
  'http://localhost:5000'
];

// Dynamic CORS origin handler for Vercel, Mobile PWA & WebView clients
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow mobile apps (no origin header), specified origins, or any .vercel.app subdomain
      if (!origin || origin.includes('vercel.app') || allowedOrigins.includes(origin)) {
        return callback(null, origin || true);
      }
      return callback(null, origin || true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Access-Control-Allow-Headers',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers'
    ],
    optionsSuccessStatus: 200
  })
);

// Enable pre-flight for all routes
app.options('*', (req: Request, res: Response) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept,Origin');
  res.sendStatus(200);
});

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
