import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { sendLoanConfirmationEmail } from '../services/emailService';

export const LoanStatus = {
  ACTIVE: 'ACTIVE',
  OVERDUE: 'OVERDUE',
  RETURNED: 'RETURNED'
} as const;

// Günlük gecikme cezası tutarı (10.0 TL / Gün)
const DAILY_FINE_RATE = 10.0;

// Helper: Dynamically compute overdue fine for active loans
const computeLoanFine = (loan: any) => {
  if (loan.status === LoanStatus.RETURNED) {
    return loan;
  }

  const now = new Date();
  const dueDate = new Date(loan.dueDate);

  if (now > dueDate) {
    const diffTime = now.getTime() - dueDate.getTime();
    const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const fineAmount = daysOverdue * DAILY_FINE_RATE;

    return {
      ...loan,
      status: LoanStatus.OVERDUE,
      fineAmount,
      daysOverdue
    };
  }

  return {
    ...loan,
    fineAmount: 0.0,
    daysOverdue: 0
  };
};

// Helper: Trigger Reservation Queue Fulfillment on Book Return
const triggerReservationFulfillment = async (bookId: string, bookTitle: string) => {
  try {
    const nextReservation = await prisma.reservation.findFirst({
      where: { bookId, status: 'WAITING' },
      orderBy: { createdAt: 'asc' }
    });

    if (nextReservation) {
      await prisma.reservation.update({
        where: { id: nextReservation.id },
        data: { status: 'FULFILLED' }
      });

      await prisma.notification.create({
        data: {
          userId: nextReservation.userId,
          title: 'Rezerve Ettiğiniz Kitap Rafta! 📚',
          message: `Sırada beklediğiniz "${bookTitle}" kitabı iade edilmiştir. 24 saat içerisinde teslim alabilirsiniz.`
        }
      });
    }
  } catch (err) {
    console.error('Rezervasyon bildirim hatası:', err);
  }
};

// 1. Personel Tarafından Kitap Ödünç Verme (ADMIN & LIBRARIAN)
export const issueLoan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, bookId, dueDate } = req.body;

    if (!userId || !bookId || !dueDate) {
      res.status(400).json({ status: 'error', message: 'Kullanıcı ID, Kitap ID ve Son Teslim Tarihi zorunludur.' });
      return;
    }

    const parsedDueDate = new Date(dueDate);
    const now = new Date();

    if (isNaN(parsedDueDate.getTime()) || parsedDueDate <= now) {
      res.status(400).json({ status: 'error', message: 'Teslim tarihi geçerli ve ileri bir tarih olmalıdır.' });
      return;
    }

    const maxDueDate = new Date(now.getTime() + 30 * 86400000);
    if (parsedDueDate > maxDueDate) {
      res.status(400).json({ status: 'error', message: 'Ödünç alma süresi maksimum 30 gün olabilir.' });
      return;
    }

    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      res.status(404).json({ status: 'error', message: 'Kullanıcı bulunamadı.' });
      return;
    }

    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) {
      res.status(404).json({ status: 'error', message: 'Kitap bulunamadı.' });
      return;
    }

    if (book.availableCopies <= 0) {
      res.status(400).json({ status: 'error', message: 'Bu kitabın mevcut stoğu kalmamıştır.' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.create({
        data: {
          userId,
          bookId,
          dueDate: parsedDueDate,
          status: LoanStatus.ACTIVE,
          fineAmount: 0.0,
          isPaid: false
        },
        include: {
          book: { select: { id: true, title: true, isbn: true, author: true } },
          user: { select: { id: true, email: true, fullName: true } }
        }
      });

      await tx.book.update({
        where: { id: bookId },
        data: { availableCopies: { decrement: 1 } }
      });

      return loan;
    });

    res.status(201).json({
      status: 'success',
      message: 'Kitap başarıyla ödünç verildi.',
      data: { loan: result }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Ödünç verme işlemi başarısız oldu.',
      error: error.message
    });
  }
};

// 2. Öğrencinin Doğrudan Kendisi İçin Kitap Ödünç Alması (MEMBER / ALL)
export const borrowBook = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Oturum bulunamadı.' });
      return;
    }

    const { bookId, dueDate } = req.body;
    const userId = req.user.userId;

    if (!bookId || !dueDate) {
      res.status(400).json({ status: 'error', message: 'Kitap seçimi ve Teslim Tarihi zorunludur.' });
      return;
    }

    const parsedDueDate = new Date(dueDate);
    const now = new Date();

    if (isNaN(parsedDueDate.getTime()) || parsedDueDate <= now) {
      res.status(400).json({ status: 'error', message: 'Teslim tarihi geçerli ve ileri bir tarih olmalıdır.' });
      return;
    }

    const maxDueDate = new Date(now.getTime() + 30 * 86400000);
    if (parsedDueDate > maxDueDate) {
      res.status(400).json({ status: 'error', message: 'Ödünç alma süresi en fazla 30 gün olabilir.' });
      return;
    }

    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) {
      res.status(404).json({ status: 'error', message: 'Seçilen kitap bulunamadı.' });
      return;
    }

    if (book.availableCopies <= 0) {
      res.status(400).json({ status: 'error', message: 'Bu kitabın raf stoğu tükenmiştir.' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.create({
        data: {
          userId,
          bookId,
          dueDate: parsedDueDate,
          status: LoanStatus.ACTIVE,
          fineAmount: 0.0,
          isPaid: false
        },
        include: {
          book: { select: { id: true, title: true, isbn: true, author: true, category: true } }
        }
      });

      await tx.book.update({
        where: { id: bookId },
        data: { availableCopies: { decrement: 1 } }
      });

      return loan;
    });

    // Otomatik bildirim oluştur
    await prisma.notification.create({
      data: {
        userId,
        title: 'Kitap Ödünç Alındı 📖',
        message: `"${book.title}" eseri ${parsedDueDate.toLocaleDateString('tr-TR')} tarihine kadar ödünç alındı.`,
        type: 'LOAN'
      }
    });

    const userObj = await prisma.user.findUnique({ where: { id: userId } });
    if (userObj) {
      sendLoanConfirmationEmail(
        userObj.email,
        userObj.fullName,
        book.title,
        parsedDueDate.toLocaleDateString('tr-TR')
      );
    }

    res.status(201).json({
      status: 'success',
      message: 'Kitap başarıyla ödünç alındı.',
      data: { loan: result }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Kitap ödünç alma işlemi başarısız oldu.',
      error: error.message
    });
  }
};

// 3. Kitap İade Alma (Staff)
export const returnLoan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { loanId } = req.params;

    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: { book: true, user: true }
    });

    if (!loan) {
      res.status(404).json({ status: 'error', message: 'Ödünç kaydı bulunamadı.' });
      return;
    }

    if (loan.status === LoanStatus.RETURNED) {
      res.status(400).json({ status: 'error', message: 'Bu kitap zaten iade edilmiştir.' });
      return;
    }

    const returnDate = new Date();
    const dueDate = new Date(loan.dueDate);

    let fineAmount = 0.0;
    let daysOverdue = 0;

    if (returnDate > dueDate) {
      const diffTime = returnDate.getTime() - dueDate.getTime();
      daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      fineAmount = daysOverdue * DAILY_FINE_RATE;
    }

    const updatedLoan = await prisma.$transaction(async (tx) => {
      const updated = await tx.loan.update({
        where: { id: loanId },
        data: {
          returnDate,
          fineAmount,
          status: LoanStatus.RETURNED,
          isPaid: fineAmount === 0 ? true : loan.isPaid
        },
        include: {
          book: { select: { id: true, title: true, isbn: true } },
          user: { select: { id: true, fullName: true, email: true } }
        }
      });

      await tx.book.update({
        where: { id: loan.bookId },
        data: { availableCopies: { increment: 1 } }
      });

      return updated;
    });

    // Rezervasyon sırasındaki kullanıcıya bildirim gönder
    await triggerReservationFulfillment(loan.bookId, loan.book.title);

    res.status(200).json({
      status: 'success',
      message: 'Kitap iade alındı.',
      data: {
        loan: updatedLoan,
        daysOverdue,
        fineAmount
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'İade alma sırasında sunucu hatası oluştu.',
      error: error.message
    });
  }
};

// 4. Sanal POS İle Ceza Ödeme ve İade Etme (MEMBER)
export const payAndReturnLoan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { loanId } = req.params;
    const { cardNumber, cardHolder } = req.body;

    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Kullanıcı kimliği doğrulanamadı.' });
      return;
    }

    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: { book: true }
    });

    if (!loan) {
      res.status(404).json({ status: 'error', message: 'Ödünç kaydı bulunamadı.' });
      return;
    }

    if (loan.status === LoanStatus.RETURNED) {
      res.status(400).json({ status: 'error', message: 'Bu kitap zaten iade edilmiştir.' });
      return;
    }

    const computed = computeLoanFine(loan);
    const returnDate = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.loan.update({
        where: { id: loanId },
        data: {
          returnDate,
          fineAmount: computed.fineAmount,
          isPaid: true,
          status: LoanStatus.RETURNED
        },
        include: {
          book: { select: { id: true, title: true, isbn: true } }
        }
      });

      await tx.book.update({
        where: { id: loan.bookId },
        data: { availableCopies: { increment: 1 } }
      });

      return updated;
    });

    // Ödeme alındı ve iade edildi bildirimi
    await prisma.notification.create({
      data: {
        userId: req.user.userId,
        title: 'Ödeme ve İade Başarılı 💳',
        message: `"${loan.book.title}" eseri için ${computed.fineAmount} TL gecikme cezası sanal POS ile ödendi ve eser iade edildi.`
      }
    });

    // Rezervasyon sırasındaki kullanıcıya bildirim gönder
    await triggerReservationFulfillment(loan.bookId, loan.book.title);

    res.status(200).json({
      status: 'success',
      message: 'Sanal POS ödemesi onaylandı ve eser kütüphaneye iade edildi.',
      data: { loan: result }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Ödeme ve iade işlemi sırasında hata oluştu.',
      error: error.message
    });
  }
};

// 5. Kendi Ödünç Kayıtlarım (MEMBER)
export const getMyLoans = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Kullanıcı kimliği doğrulanamadı.' });
      return;
    }

    const rawLoans = await prisma.loan.findMany({
      where: { userId: req.user.userId },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            isbn: true,
            author: true,
            category: true,
            locationShelf: true,
            coverUrl: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const loans = rawLoans.map(computeLoanFine);

    res.status(200).json({
      status: 'success',
      results: loans.length,
      data: { loans }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Ödünç kayıtlarınız alınırken hata oluştu.',
      error: error.message
    });
  }
};

// 6. Tüm Ödünç Kayıtları (ADMIN & LIBRARIAN)
export const getAllLoans = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query;

    const whereClause: any = {};
    if (status && Object.values(LoanStatus).includes(status as any)) {
      whereClause.status = status;
    }

    const rawLoans = await prisma.loan.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, email: true, fullName: true, role: true } },
        book: { select: { id: true, title: true, isbn: true, author: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const loans = rawLoans.map(computeLoanFine);

    res.status(200).json({
      status: 'success',
      results: loans.length,
      data: { loans }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Tüm ödünç kayıtları listelenirken hata oluştu.',
      error: error.message
    });
  }
};
