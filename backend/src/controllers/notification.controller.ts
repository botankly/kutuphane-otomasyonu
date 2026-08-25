import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { sendNotificationEmail } from '../services/emailService';

export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: string = 'INFO'
) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        isRead: false
      }
    });

    // Otomatik E-Posta Tetikleyici (Giriş Yapan / Bildirim Alan Kullanıcının E-Postasına Fırlatılır)
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, fullName: true }
    });

    if (targetUser && targetUser.email) {
      sendNotificationEmail(targetUser.email, targetUser.fullName, title, message);
    }

    return notification;
  } catch (err) {
    console.error('Bildirim oluşturma hatası:', err);
  }
};

export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Oturum bulunamadı.' });
      return;
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.userId, isRead: false }
    });

    res.status(200).json({
      status: 'success',
      data: {
        notifications,
        unreadCount
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Bildirimler alınırken hata oluştu.',
      error: error.message
    });
  }
};

export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Oturum bulunamadı.' });
      return;
    }

    await prisma.notification.updateMany({
      where: { id, userId: req.user.userId },
      data: { isRead: true }
    });

    res.status(200).json({
      status: 'success',
      message: 'Bildirim okundu olarak işaretlendi.'
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Bildirim güncellenirken hata oluştu.',
      error: error.message
    });
  }
};

export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Oturum bulunamadı.' });
      return;
    }

    await prisma.notification.updateMany({
      where: { userId: req.user.userId, isRead: false },
      data: { isRead: true }
    });

    res.status(200).json({
      status: 'success',
      message: 'Tüm bildirimler okundu olarak işaretlendi.'
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Bildirimler güncellenirken hata oluştu.',
      error: error.message
    });
  }
};
