import { Request, Response } from 'express';
import prisma from '../config/prisma';

// 1. Tüm öğrencileri / üyeleri detaylı ilişki bilgileriyle listeleme
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        loans: {
          where: {
            status: { in: ['ACTIVE', 'OVERDUE'] }
          },
          select: {
            id: true,
            status: true,
            book: {
              select: { title: true }
            }
          }
        },
        deskReservations: {
          where: {
            status: 'ACTIVE'
          },
          select: {
            id: true,
            reservationDate: true,
            startTime: true,
            endTime: true,
            desk: {
              select: {
                deskNumber: true,
                room: {
                  select: { name: true }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedUsers = users.map((u) => {
      const activeLoanCount = u.loans.length;
      const activeDeskRes = u.deskReservations.length > 0 ? u.deskReservations[0] : null;

      let currentDeskStatus = 'Masa Bulunmuyor';
      if (activeDeskRes) {
        currentDeskStatus = `${activeDeskRes.desk.room.name} (${activeDeskRes.desk.deskNumber}) [${activeDeskRes.startTime}-${activeDeskRes.endTime}]`;
      }

      return {
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
        activeLoanCount,
        activeDeskStatus: currentDeskStatus,
        activeDeskReservation: activeDeskRes
      };
    });

    res.status(200).json({
      status: 'success',
      results: formattedUsers.length,
      data: { users: formattedUsers }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Öğrenci ve üye listesi çekilirken sunucu hatası oluştu.',
      error: error.message
    });
  }
};

// 2. Belirli bir öğrencinin geçmiş tüm detaylarını getirme (Ödünç geçmişi, Masa geçmişi)
export const getUserDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        loans: {
          include: {
            book: true
          },
          orderBy: { issueDate: 'desc' }
        },
        deskReservations: {
          include: {
            desk: {
              include: {
                room: true
              }
            }
          },
          orderBy: { reservationDate: 'desc' }
        }
      }
    });

    if (!user) {
      res.status(404).json({ status: 'error', message: 'Kullanıcı bulunamadı.' });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: { user }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Öğrenci detayları çekilirken hata oluştu.',
      error: error.message
    });
  }
};

// 3. Öğrencinin üyelik durumunu değiştirme (Aktif / Askıya Al - Pasif Yap)
export const toggleUserStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      res.status(404).json({ status: 'error', message: 'Kullanıcı bulunamadı.' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        isActive: Boolean(isActive)
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true
      }
    });

    res.status(200).json({
      status: 'success',
      message: `Öğrencinin hesap durumu ${updatedUser.isActive ? 'AKTİF' : 'ASKIYA ALINDI (PASİF)'} olarak güncellendi.`,
      data: { user: updatedUser }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Kullanıcı durumu güncellenirken hata oluştu.',
      error: error.message
    });
  }
};

// 4. Öğrenci/Kullanıcı Hesabını Silme (DELETE /api/admin/users/:id)
export const deleteUserByAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      res.status(404).json({ status: 'error', message: 'Silinecek kullanıcı bulunamadı.' });
      return;
    }

    if (user.role === 'ADMIN') {
      res.status(403).json({ status: 'error', message: 'Sistem Yöneticisi hesabı silinemez.' });
      return;
    }

    await prisma.user.delete({ where: { id } });

    res.status(200).json({
      status: 'success',
      message: `"${user.fullName}" (${user.email}) hesabı veritabanından başarıyla silindi.`
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Kullanıcı hesabı silinirken hata oluştu.',
      error: error.message
    });
  }
};
