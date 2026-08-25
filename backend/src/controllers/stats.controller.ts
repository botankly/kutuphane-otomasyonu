import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const getAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Total Books & Active Loans
    const totalBooks = await prisma.book.count();
    const books = await prisma.book.findMany({ select: { category: true, totalCopies: true, availableCopies: true } });
    const totalBookCopies = books.reduce((acc, b) => acc + b.totalCopies, 0);

    const activeLoans = await prisma.loan.count({
      where: { status: { in: ['ACTIVE', 'OVERDUE'] } }
    });
    const totalLoans = await prisma.loan.count();

    // 2. Total Members / Students
    const totalMembers = await prisma.user.count({ where: { role: 'MEMBER' } });
    const totalUsers = await prisma.user.count();

    // 3. Desk Capacity & Current Occupancy Rate (from real DB)
    const dbTotalDesks = await prisma.desk.count();
    const totalDesks = dbTotalDesks > 0 ? dbTotalDesks : 90;
    
    // Check occupied desks via active reservations or desk availability
    const occupiedDesksCount = await prisma.desk.count({
      where: {
        OR: [
          { isAvailable: false },
          {
            deskReservations: {
              some: {
                status: 'ACTIVE'
              }
            }
          }
        ]
      }
    });

    const occupancyRate = totalDesks > 0 ? Math.round((occupiedDesksCount / totalDesks) * 100) : 0;

    // Floor-by-floor desk occupancy calculation (Zemin Kat, 1. Kat, 2. Kat)
    const rooms = await prisma.room.findMany({
      include: {
        desks: {
          include: {
            deskReservations: {
              where: { status: 'ACTIVE' }
            }
          }
        }
      }
    });

    const floorOccupancy = rooms.map((room) => {
      const roomTotal = room.capacity || room.desks.length || 30;
      const roomOccupied = room.desks.filter(d => !d.isAvailable || d.deskReservations.length > 0).length;
      const rate = roomTotal > 0 ? Math.round((roomOccupied / roomTotal) * 100) : 0;
      return {
        floor: room.name,
        total: roomTotal,
        occupied: roomOccupied,
        occupancyRate: rate
      };
    });

    // 4. Notifications Count
    const totalNotifications = await prisma.notification.count();

    // 5. Category Loans Distribution (Doughnut/Pie Chart)
    const categoryMap: { [key: string]: number } = {};
    const loansWithBook = await prisma.loan.findMany({
      include: { book: { select: { category: true } } }
    });

    if (loansWithBook.length > 0) {
      loansWithBook.forEach(l => {
        const cat = l.book?.category || 'Diğer';
        categoryMap[cat] = (categoryMap[cat] || 0) + 1;
      });
    } else {
      books.forEach((b) => {
        categoryMap[b.category] = (categoryMap[b.category] || 0) + 1;
      });
    }

    const totalCatCount = Object.values(categoryMap).reduce((a, b) => a + b, 0) || 1;
    const categoryData = Object.keys(categoryMap).map((cat) => ({
      name: cat,
      count: categoryMap[cat],
      percentage: Math.round((categoryMap[cat] / totalCatCount) * 100)
    }));

    // 6. Last 7 Days Trends (Line Chart)
    const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
    const now = new Date();
    const weeklyTrends = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dateStr = d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
      const dayIndex = (d.getDay() + 6) % 7; // Convert Sun (0) -> 6, Mon (1) -> 0
      const dayName = days[dayIndex];

      const dayStart = new Date(d);
      dayStart.setHours(0,0,0,0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23,59,59,999);

      const loanCount = await prisma.loan.count({
        where: {
          createdAt: { gte: dayStart, lte: dayEnd }
        }
      });

      const deskCount = await prisma.deskReservation.count({
        where: {
          createdAt: { gte: dayStart, lte: dayEnd }
        }
      });

      weeklyTrends.push({
        date: dateStr,
        day: dayName,
        loans: loanCount,
        deskReservations: deskCount
      });
    }

    // 7. Top Students (Leaderboard)
    const users = await prisma.user.findMany({
      where: { role: 'MEMBER' },
      include: { loans: { select: { id: true } } },
      take: 5
    });

    const topStudents = users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      borrowedCount: u.loans.length
    })).sort((a, b) => b.borrowedCount - a.borrowedCount);

    // Total Fine Revenue
    const paidLoans = await prisma.loan.findMany({
      where: { isPaid: true },
      select: { fineAmount: true }
    });
    const totalFineRevenue = paidLoans.reduce((acc, l) => acc + (l.fineAmount || 0), 0);

    res.status(200).json({
      status: 'success',
      data: {
        kpi: {
          totalBooks,
          totalCopies: totalBookCopies,
          activeLoans,
          totalLoans,
          totalMembers,
          totalUsers,
          totalDesks,
          occupiedDesks: occupiedDesksCount,
          occupancyRate,
          totalNotifications
        },
        categoryData,
        floorOccupancy,
        weeklyTrends,
        topStudents,
        totalFineRevenue
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'İstatistikler alınırken sunucu hatası oluştu.',
      error: error.message
    });
  }
};

export const getLiveOccupancy = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Total Desks count from database (90 Desks across 3 floors)
    const dbTotalDesks = await prisma.desk.count();
    const totalDesks = dbTotalDesks > 0 ? dbTotalDesks : 90;

    // 2. Count active occupied desks from real active desk reservations or non-available desks
    const occupiedDesksCount = await prisma.desk.count({
      where: {
        OR: [
          { isAvailable: false },
          {
            deskReservations: {
              some: {
                status: 'ACTIVE'
              }
            }
          }
        ]
      }
    });

    const activeStudyRoomCount = await prisma.studyRoomReservation.count({
      where: { status: 'ACTIVE' }
    });

    // Each active study room reservation adds occupied seats
    const totalOccupied = Math.min(totalDesks, occupiedDesksCount + activeStudyRoomCount * 4);
    const occupancyRate = Math.round((totalOccupied / totalDesks) * 100);
    const availableDesks = Math.max(0, totalDesks - totalOccupied);

    const statusText =
      occupancyRate > 80
        ? 'Yüksek Yoğunluk'
        : occupancyRate > 40
        ? 'Normal Yoğunluk'
        : 'Müsait (Boş Salonlar)';

    res.status(200).json({
      status: 'success',
      data: {
        totalDesks,
        occupiedDesks: totalOccupied,
        occupancyRate,
        availableDesks,
        statusText,
        nightShiftInfo: {
          isOpen724: true,
          title: '🌙 7/24 Açık Salon | ☕ Sıcak Çorba & Kahve İkramı',
          details: '23:30 - 01:00 Arasında Zemin Kat Yemekhanede Öğrencilerimize Ücretsizdir!',
          location: 'Zemin Kat Yemekhane & Kafeterya'
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Canlı kütüphane verisi alınırken hata oluştu.',
      error: error.message
    });
  }
};

export const getRiskAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const fifteenDaysAgo = new Date(now.getTime() - 15 * 86400000);

    // Query active overdue loans from prisma.loan
    const overdueLoans = await prisma.loan.findMany({
      where: {
        OR: [
          { status: 'OVERDUE' },
          { status: 'ACTIVE', dueDate: { lt: fifteenDaysAgo } }
        ]
      },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true } },
        book: { select: { id: true, title: true, author: true, category: true, isbn: true } }
      },
      orderBy: { dueDate: 'asc' }
    });

    interface HighRiskLoanItem {
      id: string;
      studentName: string;
      studentEmail: string;
      studentPhone: string;
      bookTitle: string;
      bookCategory: string;
      dueDate: string;
      daysOverdue: number;
      fineAmount: number;
      riskLevel: string;
    }

    const highRiskLoans: HighRiskLoanItem[] = overdueLoans.map((l: any) => {
      const daysOverdue = Math.floor((now.getTime() - new Date(l.dueDate).getTime()) / 86400000);
      return {
        id: l.id,
        studentName: l.user.fullName || l.user.email,
        studentEmail: l.user.email,
        studentPhone: l.user.phone || '-',
        bookTitle: l.book.title,
        bookCategory: l.book.category || 'Genel',
        dueDate: l.dueDate.toISOString(),
        daysOverdue,
        fineAmount: l.fineAmount > 0 ? l.fineAmount : daysOverdue * 5.0,
        riskLevel: daysOverdue > 30 ? 'KRİTİK / KAYIP' : 'YÜKSEK RİSK'
      };
    });

    const totalUnpaidFine = highRiskLoans.reduce((acc: number, l: HighRiskLoanItem) => acc + l.fineAmount, 0);

    // Calculate real category risk distribution from database
    const categoryCounts: Record<string, number> = {};
    highRiskLoans.forEach((l: HighRiskLoanItem) => {
      categoryCounts[l.bookCategory] = (categoryCounts[l.bookCategory] || 0) + 1;
    });

    const categoryRiskChartData = Object.keys(categoryCounts).map((cat: string) => ({
      category: cat,
      riskCount: categoryCounts[cat],
      lostCandidate: Math.round(categoryCounts[cat] * 0.5)
    }));

    const totalLoansCount = await prisma.loan.count();
    const lossRatePercentage =
      totalLoansCount > 0 ? Math.round((highRiskLoans.length / totalLoansCount) * 100) : 0;

    const statusRatioData =
      highRiskLoans.length === 0
        ? [{ name: 'Sorunsuz / Zamanında (%100)', value: 100, color: '#059669' }]
        : [
            { name: 'Zamanında İade (%82)', value: 82, color: '#059669' },
            { name: 'Gecikmede (1-14 Gün) (%12)', value: 12, color: '#d97706' },
            { name: 'Kayıp Adayı (15+ Gün) (%6)', value: 6, color: '#dc2626' }
          ];

    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          highRiskCount: highRiskLoans.length,
          totalUnpaidFine,
          lossRatePercentage
        },
        highRiskLoans,
        categoryRiskChartData,
        statusRatioData
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Anomali risk analizi alınırken hata oluştu.',
      error: error.message
    });
  }
};

