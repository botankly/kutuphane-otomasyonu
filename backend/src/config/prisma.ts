import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

// Vercel Serverless environment file system handling
if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
  const tmpDbPath = '/tmp/dev.db';
  if (!fs.existsSync(tmpDbPath)) {
    console.log('📦 Vercel Serverless ortamı algılandı. SQLite veritabanı /tmp/dev.db klasörüne kopyalanıyor...');
    try {
      // Look for existing dev.db bundled with deployment
      const potentialDbPaths = [
        path.join(process.cwd(), 'prisma', 'dev.db'),
        path.join(process.cwd(), 'dev.db'),
        path.join(__dirname, '..', '..', 'prisma', 'dev.db'),
        path.join(__dirname, '..', '..', 'dev.db')
      ];

      let dbCopied = false;
      for (const p of potentialDbPaths) {
        if (fs.existsSync(p)) {
          fs.copyFileSync(p, tmpDbPath);
          console.log(`✅ SQLite veritabanı (${p}) -> ${tmpDbPath} kopyalandı.`);
          dbCopied = true;
          break;
        }
      }

      if (!dbCopied) {
        fs.writeFileSync(tmpDbPath, '');
        console.log('ℹ️ Yeni boş SQLite veritabanı /tmp/dev.db üzerinde oluşturuldu.');
      }
    } catch (e) {
      console.error('⚠️ /tmp/dev.db oluşturulurken uyarı:', e);
    }
  }
  process.env.DATABASE_URL = `file:${tmpDbPath}`;
} else if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});

/**
 * Ensures default seed users (Admin, Librarian, Member) exist in the database.
 * Executes automatically during login/register if database is fresh/empty.
 */
export const ensureSeedUsersExist = async (): Promise<void> => {
  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) return;

    console.log('🌱 Veritabanında kullanıcı bulunamadı. Otomatik Seed (Admin/Öğrenci) çalıştırılıyor...');

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

    console.log('✅ Otomatik seed tamamlandı. 4 varsayılan kullanıcı hazır.');
  } catch (err) {
    console.error('⚠️ Auto-seed sırasında uyarı:', err);
  }
};

export default prisma;
