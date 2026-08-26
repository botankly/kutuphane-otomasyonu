import { Request, Response } from 'express';
import { Role } from '../types/roles';
import prisma, { ensureSeedUsersExist } from '../config/prisma';
import { hashPassword, comparePassword } from '../utils/password.util';
import { generateToken } from '../utils/jwt.util';
import { sendRegistrationEmail } from '../services/emailService';
import { createNotification } from './notification.controller';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureSeedUsersExist();
    const { email, password, fullName, role } = req.body;

    if (!email || !password || !fullName) {
      res.status(400).json({
        status: 'error',
        message: 'E-posta, şifre ve ad-soyad alanları zorunludur.'
      });
      return;
    }

    // E-posta mükerrerlik kontrolü
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      res.status(409).json({
        status: 'error',
        message: 'Bu e-posta adresi ile kayıtlı bir kullanıcı zaten mevcut.'
      });
      return;
    }

    // Şifre hashleme
    const passwordHash = await hashPassword(password);

    // Yeni kullanıcı kaydı (Varsayılan rol: MEMBER)
    const userRole = role && Object.values(Role).includes(role) ? role : Role.MEMBER;

    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        role: userRole
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Otomatik Bildirim & Gerçek E-Posta Tetikleme
    createNotification(
      newUser.id,
      '🎉 Kütüphanemize Hoş Geldiniz!',
      `Sayın ${newUser.fullName}, kütüphane otomasyon sistemine kaydınız başarıyla tamamlandı.`,
      'WELCOME'
    );

    sendRegistrationEmail(newUser.email, newUser.fullName);

    // JWT Token üretimi
    const token = generateToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role
    });

    res.status(201).json({
      status: 'success',
      message: 'Kullanıcı kaydı başarıyla oluşturuldu.',
      data: {
        token,
        user: newUser
      }
    });
  } catch (error: any) {
    console.error("REGISTER ERROR DETAILS:", error);
    res.status(500).json({
      status: 'error',
      message: 'Kullanıcı kaydı sırasında sunucu hatası oluştu. Lütfen Vercel panelinizde DATABASE_URL ve JWT_SECRET ortam değişkenlerini kontrol edin.',
      error: error?.message || String(error)
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureSeedUsersExist();
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        status: 'error',
        message: 'E-posta ve şifre alanları zorunludur.'
      });
      return;
    }

    // Kullanıcı sorgulama
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      res.status(401).json({
        status: 'error',
        message: 'E-posta veya şifre hatalı.'
      });
      return;
    }

    // Şifre doğrulama
    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      res.status(401).json({
        status: 'error',
        message: 'E-posta veya şifre hatalı.'
      });
      return;
    }

    // JWT Token üretimi
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    const { passwordHash, ...userWithoutPassword } = user;

    res.status(200).json({
      status: 'success',
      message: 'Giriş başarılı.',
      data: {
        token,
        user: userWithoutPassword
      }
    });
  } catch (error: any) {
    console.error("LOGIN ERROR DETAILS:", error);
    res.status(500).json({
      status: 'error',
      message: 'Giriş yapılırken sunucu hatası oluştu. Lütfen Vercel panelinizde DATABASE_URL ve JWT_SECRET ortam değişkenlerini kontrol edin.',
      error: error?.message || String(error)
    });
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Kullanıcı oturumu bulunamadı.'
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        department: true,
        avatarUrl: true,
        emailNotifications: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'Kullanıcı bulunamadı.'
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: { user }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Kullanıcı profili alınırken hata oluştu.',
      error: error.message
    });
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Kullanıcı oturumu bulunamadı.' });
      return;
    }

    const { fullName, phone, department, avatarUrl, emailNotifications } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        ...(fullName && { fullName }),
        phone: phone !== undefined ? phone : undefined,
        department: department !== undefined ? department : undefined,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
        emailNotifications: emailNotifications !== undefined ? emailNotifications : undefined
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        department: true,
        avatarUrl: true,
        emailNotifications: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Profil bilgileriniz başarıyla güncellendi.',
      data: { user: updatedUser }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Profil bilgileri güncellenirken bir hata oluştu.',
      error: error.message
    });
  }
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Kullanıcı oturumu bulunamadı.' });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ status: 'error', message: 'Mevcut şifre ve yeni şifre gereklidir.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (!user) {
      res.status(404).json({ status: 'error', message: 'Kullanıcı bulunamadı.' });
      return;
    }

    const isPasswordValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      res.status(400).json({ status: 'error', message: 'Mevcut şifreniz hatalı.' });
      return;
    }

    const newPasswordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: req.user.userId },
      data: { passwordHash: newPasswordHash }
    });

    res.status(200).json({
      status: 'success',
      message: 'Şifreniz başarıyla değiştirildi.'
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Şifre değiştirilirken bir hata oluştu.',
      error: error.message
    });
  }
};
