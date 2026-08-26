import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL && !process.env.MONGODB_URI) {
  console.error('⚠️ [CRITICAL WARNING] DATABASE_URL veya MONGODB_URI ortam değişkeni Vercel panelinde bulunamadı!');
}

if (!process.env.JWT_SECRET) {
  console.error('⚠️ [CRITICAL WARNING] JWT_SECRET ortam değişkeni Vercel panelinde tanımlanmamış!');
}

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});

export default prisma;
