import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const createReservation = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Oturum bulunamadı.' });
      return;
    }

    const { bookId } = req.body;
    const userId = req.user.userId;

    if (!bookId) {
      res.status(400).json({ status: 'error', message: 'Kitap ID zorunludur.' });
      return;
    }

    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) {
      res.status(404).json({ status: 'error', message: 'Kitap bulunamadı.' });
      return;
    }

    // Kullanıcının bu kitap için zaten aktif rezervasyonu var mı?
    const existingReservation = await prisma.reservation.findFirst({
      where: { userId, bookId, status: 'WAITING' }
    });

    if (existingReservation) {
      res.status(409).json({
        status: 'error',
        message: 'Bu kitap için zaten sıradasınız.'
      });
      return;
    }

    const reservation = await prisma.reservation.create({
      data: {
        userId,
        bookId,
        status: 'WAITING'
      },
      include: {
        book: { select: { id: true, title: true, author: true } }
      }
    });

    // Kullanıcıya teyit bildirimi gönder
    await prisma.notification.create({
      data: {
        userId,
        title: 'Rezervasyon Kaydı Alındı',
        message: `"${book.title}" eseri için bekleme sırasına alındınız. Eser iade edildiğinde tarafınıza bildirim iletilecektir.`
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Bekleme sırasına başarıyla kaydolundunuz.',
      data: { reservation }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Rezervasyon sırasında hata oluştu.',
      error: error.message
    });
  }
};

export const getMyReservations = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Oturum bulunamadı.' });
      return;
    }

    const reservations = await prisma.reservation.findMany({
      where: { userId: req.user.userId },
      include: {
        book: { select: { id: true, title: true, author: true, category: true, coverUrl: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      status: 'success',
      data: { reservations }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Rezervasyonlarınız alınırken hata oluştu.',
      error: error.message
    });
  }
};
