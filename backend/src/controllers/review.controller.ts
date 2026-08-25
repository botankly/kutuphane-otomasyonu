import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const createReview = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Oturum bulunamadı.' });
      return;
    }

    const { id: bookId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.userId;

    if (!rating || !comment) {
      res.status(400).json({ status: 'error', message: 'Yıldız puanı ve yorum yazısı zorunludur.' });
      return;
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      res.status(400).json({ status: 'error', message: 'Yıldız puanı 1 ile 5 arasında olmalıdır.' });
      return;
    }

    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) {
      res.status(404).json({ status: 'error', message: 'Kitap bulunamadı.' });
      return;
    }

    const review = await prisma.review.create({
      data: {
        userId,
        bookId,
        rating: numRating,
        comment
      },
      include: {
        user: { select: { id: true, fullName: true } }
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Yorumunuz ve değerlendirmeniz başarıyla eklendi.',
      data: { review }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Değerlendirme eklenirken hata oluştu.',
      error: error.message
    });
  }
};

export const getBookReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: bookId } = req.params;

    const reviews = await prisma.review.findMany({
      where: { bookId },
      include: {
        user: { select: { id: true, fullName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1))
        : 5.0;

    res.status(200).json({
      status: 'success',
      data: {
        reviews,
        totalReviews,
        averageRating
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Değerlendirmeler alınırken hata oluştu.',
      error: error.message
    });
  }
};
