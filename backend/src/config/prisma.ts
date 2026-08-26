import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

// Vercel Serverless & Local SQLite File Handling Fallback
if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('file:')) {
    const tmpDbPath = '/tmp/dev.db';
    if (!fs.existsSync(tmpDbPath)) {
      try {
        const potentialDbPaths = [
          path.join(process.cwd(), 'prisma', 'dev.db'),
          path.join(process.cwd(), 'dev.db'),
          path.join(__dirname, '..', '..', 'prisma', 'dev.db'),
          path.join(__dirname, '..', '..', 'dev.db')
        ];
        let copied = false;
        for (const p of potentialDbPaths) {
          if (fs.existsSync(p)) {
            fs.copyFileSync(p, tmpDbPath);
            copied = true;
            break;
          }
        }
        if (!copied) {
          fs.writeFileSync(tmpDbPath, '');
        }
      } catch (e) {
        console.error('SQLite /tmp handler notice:', e);
      }
    }
    process.env.DATABASE_URL = `file:${tmpDbPath}`;
  }
} else if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

// Singleton Pattern to prevent Prisma Connection Pool Exhaustion on Vercel Serverless Cold Starts
declare global {
  var prismaGlobal: PrismaClient | undefined;
}

const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

/**
 * Ensures default seed users (Admin, Librarian, Member, Botan) exist in database.
 * Executes automatically during login/register if database is empty.
 */
export const ensureSeedUsersExist = async (): Promise<void> => {
  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) return;

    console.log('🌱 Veritabanı boş. Sunum için varsayılan kullanıcılar oluşturuluyor...');

    const adminPassword = await bcrypt.hash('admin123', 10);
    const librarianPassword = await bcrypt.hash('librarian123', 10);
    const memberPassword = await bcrypt.hash('member123', 10);
    const botanPassword = await bcrypt.hash('123456', 10);

    const defaultUsers = [
      {
        email: 'admin@kutuphane.com',
        passwordHash: adminPassword,
        fullName: 'Sistem Yöneticisi',
        role: 'ADMIN'
      },
      {
        email: 'librarian@kutuphane.com',
        passwordHash: librarianPassword,
        fullName: 'Kütüphane Görevlisi',
        role: 'LIBRARIAN'
      },
      {
        email: 'member@kutuphane.com',
        passwordHash: memberPassword,
        fullName: 'Örnek Kütüphane Üyesi',
        role: 'MEMBER'
      },
      {
        email: 'botankulay1@gmail.com',
        passwordHash: botanPassword,
        fullName: 'Botan Kulay',
        role: 'ADMIN'
      }
    ];

    for (const u of defaultUsers) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: { fullName: u.fullName, role: u.role, isActive: true },
        create: {
          email: u.email,
          passwordHash: u.passwordHash,
          fullName: u.fullName,
          role: u.role,
          isActive: true
        }
      });
    }

    console.log('✅ Seed tamamlandı: admin@kutuphane.com, member@kutuphane.com, botankulay1@gmail.com hazır.');
  } catch (err) {
    console.error('⚠️ Auto-seed sırasında hata:', err);
  }
};

export default prisma;
