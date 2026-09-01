import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { sendReservationEmail } from '../services/emailService';
import { createNotification } from './notification.controller';

// Helper: 15 dakikayı doldurmuş, check-in yapılmamış masa rezervasyonlarını otomatik iptal etme
export const autoReleaseExpiredReservations = async (): Promise<number> => {
  try {
    const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
    const now = new Date();
    const fifteenMinsAgo = new Date(now.getTime() - FIFTEEN_MINUTES_MS);

    const expiredReservations = await prisma.deskReservation.findMany({
      where: {
        status: 'ACTIVE',
        isCheckedIn: false,
        createdAt: {
          lte: fifteenMinsAgo
        }
      },
      include: {
        desk: {
          include: {
            room: true
          }
        }
      }
    });

    for (const res of expiredReservations) {
      await prisma.deskReservation.update({
        where: { id: res.id },
        data: { status: 'CANCELLED' }
      });

      await createNotification(
        res.userId,
        '⏳ Masa Rezervasyonu Otomatik İptal Edildi',
        `15 dakika içinde Check-In yapılmadığı için ${res.desk?.room?.name || ''} (${res.desk?.deskNumber || ''}) masa rezervasyonunuz otomatik olarak iptal edilmiştir. Masa tekrar serbest kalmıştır.`,
        'RESERVATION'
      );
    }

    return expiredReservations.length;
  } catch (err) {
    console.error('Otomatik masa iptali kontrolünde hata:', err);
    return 0;
  }
};

// 1. Tüm çalışma salonlarını ve masalarını listeleme
export const getRooms = async (req: Request, res: Response): Promise<void> => {
  try {
    const rooms = await prisma.room.findMany({
      include: {
        desks: {
          orderBy: [{ yPosition: 'asc' }, { xPosition: 'asc' }]
        }
      },
      orderBy: { name: 'asc' }
    });

    res.status(200).json({
      status: 'success',
      results: rooms.length,
      data: { rooms }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Salon ve masa verileri çekilirken sunucu hatası oluştu.',
      error: error.message
    });
  }
};

// 2. Seçilen salon, tarih ve saat aralığı için masaların doluluk/boşluk durumunu sorgulama
export const getDeskAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    await autoReleaseExpiredReservations();
    const { roomId, date, startTime, endTime } = req.query;

    if (!roomId || !date || !startTime || !endTime) {
      res.status(400).json({
        status: 'error',
        message: 'Salon ID, tarih, başlangıç ve bitiş saati zorunludur.'
      });
      return;
    }

    const reservationDate = new Date(String(date));

    // O gün ve saat aralığındaki aktif rezervasyonlar
    const activeReservations = await prisma.deskReservation.findMany({
      where: {
        status: 'ACTIVE',
        reservationDate: {
          gte: new Date(reservationDate.setHours(0, 0, 0, 0)),
          lte: new Date(reservationDate.setHours(23, 59, 59, 999))
        },
        startTime: String(startTime),
        endTime: String(endTime)
      },
      select: {
        deskId: true,
        user: {
          select: {
            fullName: true
          }
        }
      }
    });

    const reservedDeskIdsMap = new Map<string, string>();
    activeReservations.forEach((r) => {
      reservedDeskIdsMap.set(r.deskId, r.user.fullName);
    });

    // Salondaki tüm masalar
    const desks = await prisma.desk.findMany({
      where: { roomId: String(roomId) },
      orderBy: [{ yPosition: 'asc' }, { xPosition: 'asc' }]
    });

    const formattedDesks = desks.map((desk) => {
      const isOccupied = reservedDeskIdsMap.has(desk.id);
      return {
        ...desk,
        isOccupied,
        occupiedBy: isOccupied ? reservedDeskIdsMap.get(desk.id) : null
      };
    });

    res.status(200).json({
      status: 'success',
      data: {
        roomId,
        date: String(date),
        startTime: String(startTime),
        endTime: String(endTime),
        desks: formattedDesks
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Masa doluluk durumu sorgulanırken hata oluştu.',
      error: error.message
    });
  }
};

// 3. Masa Rezervasyonu Oluşturma
export const createDeskReservation = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const { deskId, date, startTime, endTime } = req.body;

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Yetkisiz erişim. Lütfen giriş yapın.' });
      return;
    }

    if (!deskId || !date || !startTime || !endTime) {
      res.status(400).json({
        status: 'error',
        message: 'Masa ID, tarih, başlangıç ve bitiş saati zorunludur.'
      });
      return;
    }

    const resDate = new Date(date);
    const startOfDay = new Date(resDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(resDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Çakışan rezervasyon var mı?
    const existingRes = await prisma.deskReservation.findFirst({
      where: {
        deskId,
        status: 'ACTIVE',
        reservationDate: {
          gte: startOfDay,
          lte: endOfDay
        },
        startTime: String(startTime),
        endTime: String(endTime)
      }
    });

    if (existingRes) {
      res.status(409).json({
        status: 'error',
        message: 'Seçtiğiniz masa belirtilen saat aralığında zaten rezerve edilmiş.'
      });
      return;
    }

    // Kullanıcının aynı tarih ve saatte başka masa rezervasyonu var mı?
    const userConflict = await prisma.deskReservation.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        reservationDate: {
          gte: startOfDay,
          lte: endOfDay
        },
        startTime: String(startTime),
        endTime: String(endTime)
      }
    });

    if (userConflict) {
      res.status(400).json({
        status: 'error',
        message: 'Aynı tarih ve saat aralığında zaten aktif bir masa rezervasyonunuz bulunmaktadır.'
      });
      return;
    }

    const reservation = await prisma.deskReservation.create({
      data: {
        userId,
        deskId,
        reservationDate: startOfDay,
        startTime: String(startTime),
        endTime: String(endTime),
        status: 'ACTIVE',
        isCheckedIn: false
      },
      include: {
        desk: {
          include: {
            room: true
          }
        }
      }
    });

    // Otomatik Bildirim & Gerçek E-Posta Gönderimi
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      sendReservationEmail(
        user.email,
        user.fullName,
        reservation.desk.deskNumber,
        reservation.desk.room.name,
        startOfDay.toLocaleDateString('tr-TR'),
        `${startTime} - ${endTime}`
      );

      createNotification(
        userId,
        '🪑 Masa Rezervasyonu Onaylandı',
        `${reservation.desk.room.name} (${reservation.desk.deskNumber}) masanız ${startOfDay.toLocaleDateString('tr-TR')} [${startTime}-${endTime}] için ayrılmıştır.`,
        'RESERVATION'
      );
    }

    res.status(201).json({
      status: 'success',
      message: 'Masa rezervasyonu başarıyla oluşturuldu!',
      data: { reservation }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Masa rezervasyonu oluşturulurken hata oluştu.',
      error: error.message
    });
  }
};

// 4. Kullanıcının Kendi Masa Rezervasyonlarını Listeleme
export const getUserDeskReservations = async (req: Request, res: Response): Promise<void> => {
  try {
    await autoReleaseExpiredReservations();
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Yetkisiz erişim.' });
      return;
    }

    const reservations = await prisma.deskReservation.findMany({
      where: { userId },
      include: {
        desk: {
          include: {
            room: true
          }
        }
      },
      orderBy: { reservationDate: 'desc' }
    });

    res.status(200).json({
      status: 'success',
      results: reservations.length,
      data: { reservations }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Rezervasyonlarınız listelenirken hata oluştu.',
      error: error.message
    });
  }
};

// 5. Masa Rezervasyonunu İptal Etme
export const cancelDeskReservation = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Yetkisiz erişim.' });
      return;
    }

    const existingRes = await prisma.deskReservation.findUnique({
      where: { id }
    });

    if (!existingRes) {
      res.status(404).json({ status: 'error', message: 'Rezervasyon bulunamadı.' });
      return;
    }

    if (existingRes.userId !== userId) {
      res.status(403).json({ status: 'error', message: 'Bu rezervasyonu iptal etme yetkiniz yok.' });
      return;
    }

    const updated = await prisma.deskReservation.update({
      where: { id },
      data: { status: 'CANCELLED', isCheckedIn: false }
    });

    res.status(200).json({
      status: 'success',
      message: 'Masa rezervasyonu başarıyla iptal edildi.',
      data: { reservation: updated }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Rezervasyon iptal edilirken hata oluştu.',
      error: error.message
    });
  }
};

// 6. QR Check-In (Masaya Otur)
export const checkInDeskReservation = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Yetkisiz erişim.' });
      return;
    }

    const reservation = await prisma.deskReservation.findUnique({
      where: { id },
      include: { desk: { include: { room: true } } }
    });

    if (!reservation) {
      res.status(404).json({ status: 'error', message: 'Rezervasyon bulunamadı.' });
      return;
    }

    if (reservation.userId !== userId) {
      res.status(403).json({ status: 'error', message: 'Bu işlem için yetkiniz yok.' });
      return;
    }

    const updated = await prisma.deskReservation.update({
      where: { id },
      data: { isCheckedIn: true }
    });

    createNotification(
      userId,
      '📱 Masaya Oturuldu (Check-In)',
      `${reservation.desk.room.name} (${reservation.desk.deskNumber}) masasında oturumunuz başladı. Çalışmalarınızda başarılar!`,
      'RESERVATION'
    );

    res.status(200).json({
      status: 'success',
      message: 'Masaya check-in yapıldı. Masadaki oturumunuz aktif!',
      data: { reservation: updated }
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Check-in sırasında hata oluştu.', error: error.message });
  }
};

// 7. QR Check-Out (Masayı Boşalt)
export const checkOutDeskReservation = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Yetkisiz erişim.' });
      return;
    }

    const reservation = await prisma.deskReservation.findUnique({
      where: { id },
      include: { desk: { include: { room: true } } }
    });

    if (!reservation) {
      res.status(404).json({ status: 'error', message: 'Rezervasyon bulunamadı.' });
      return;
    }

    if (reservation.userId !== userId) {
      res.status(403).json({ status: 'error', message: 'Bu işlem için yetkiniz yok.' });
      return;
    }

    const updated = await prisma.deskReservation.update({
      where: { id },
      data: { status: 'COMPLETED', isCheckedIn: false }
    });

    createNotification(
      userId,
      '🚪 Masadan Ayrılındı (Check-Out)',
      `${reservation.desk.room.name} (${reservation.desk.deskNumber}) masası boşaltıldı ve serbest bırakıldı. Teşekkür ederiz!`,
      'RESERVATION'
    );

    res.status(200).json({
      status: 'success',
      message: 'Masa başarıyla boşaltıldı ve serbest bırakıldı.',
      data: { reservation: updated }
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Check-out sırasında hata oluştu.', error: error.message });
  }
};

// ==========================================
// ADMIN MASA YÖNETİMİ ENDPOINTS
// ==========================================

export const addDeskByAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    let { roomId, roomName, floorName, deskNumber, xPosition, yPosition, hasPowerOutlet } = req.body;

    if (!roomId && (roomName || floorName)) {
      const targetName = String(roomName || floorName).trim();
      let room = await prisma.room.findFirst({
        where: { name: { equals: targetName, mode: 'insensitive' } }
      });

      if (!room) {
        room = await prisma.room.create({
          data: {
            name: targetName,
            capacity: 0,
            description: `${targetName} Çalışma Alanı`
          }
        });
      }
      roomId = room.id;
    }

    if (!roomId || !deskNumber) {
      res.status(400).json({
        status: 'error',
        message: 'Salon / Kat seçimi ve Masa Numarası zorunludur.'
      });
      return;
    }

    const existingDesk = await prisma.desk.findFirst({
      where: { roomId, deskNumber: String(deskNumber).trim() }
    });

    if (existingDesk) {
      res.status(409).json({
        status: 'error',
        message: `Bu salonda "${deskNumber}" numaralı masa zaten mevcut.`
      });
      return;
    }

    const newDesk = await prisma.desk.create({
      data: {
        roomId,
        deskNumber,
        xPosition: Number(xPosition) || 1,
        yPosition: Number(yPosition) || 1,
        isAvailable: true,
        hasPowerOutlet: Boolean(hasPowerOutlet)
      }
    });

    await prisma.room.update({
      where: { id: roomId },
      data: { capacity: { increment: 1 } }
    });

    res.status(201).json({
      status: 'success',
      message: 'Yeni masa başarıyla oluşturuldu ve haritaya eklendi!',
      data: { desk: newDesk }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Masa eklenirken sunucu hatası oluştu.',
      error: error.message
    });
  }
};

export const deleteDeskByAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const desk = await prisma.desk.findUnique({
      where: { id }
    });

    if (!desk) {
      res.status(404).json({ status: 'error', message: 'Masa bulunamadı.' });
      return;
    }

    const activeResCount = await prisma.deskReservation.count({
      where: { deskId: id, status: 'ACTIVE' }
    });

    if (activeResCount > 0) {
      res.status(400).json({
        status: 'error',
        message: 'Bu masanın geleceğe yönelik aktif rezervasyonları bulunmaktadır.'
      });
      return;
    }

    await prisma.deskReservation.deleteMany({ where: { deskId: id } });
    await prisma.desk.delete({ where: { id } });

    await prisma.room.update({
      where: { id: desk.roomId },
      data: { capacity: { decrement: 1 } }
    });

    res.status(200).json({
      status: 'success',
      message: 'Masa başarıyla sistemden silindi.'
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Masa silinirken sunucu hatası oluştu.',
      error: error.message
    });
  }
};

export const updateDeskByAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { deskNumber, xPosition, yPosition, isAvailable, hasPowerOutlet } = req.body;

    const desk = await prisma.desk.findUnique({ where: { id } });

    if (!desk) {
      res.status(404).json({ status: 'error', message: 'Masa bulunamadı.' });
      return;
    }

    const updatedDesk = await prisma.desk.update({
      where: { id },
      data: {
        ...(deskNumber && { deskNumber }),
        ...(xPosition !== undefined && { xPosition: Number(xPosition) }),
        ...(yPosition !== undefined && { yPosition: Number(yPosition) }),
        ...(isAvailable !== undefined && { isAvailable: Boolean(isAvailable) }),
        ...(hasPowerOutlet !== undefined && { hasPowerOutlet: Boolean(hasPowerOutlet) })
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Masa bilgileri güncellendi.',
      data: { desk: updatedDesk }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Masa güncellenirken sunucu hatası oluştu.',
      error: error.message
    });
  }
};
