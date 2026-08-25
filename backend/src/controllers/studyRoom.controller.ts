import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { createNotification } from './notification.controller';

const DEFAULT_STUDY_ROOMS = [
  {
    name: 'Grup Oda A - Proje & Araştırma Salonu (6 Kişilik)',
    capacity: 6,
    equipment: 'Akıllı Tahta, Projeksiyon, 6 Adet Priz, Yüksek Hızlı Wi-Fi',
    description: 'Proje takımları ve grup sunum çalışmaları için tam donanımlı ses yalıtımlı çalışma odası.',
    imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=80'
  },
  {
    name: 'Grup Oda B - Sessiz Beyin Fırtınası (4 Kişilik)',
    capacity: 4,
    equipment: 'Yazı Tahtası, 4 Adet Priz, Wi-Fi, Ergonomik Koltuklar',
    description: 'Odaklanmış küçük grup tartışmaları ve akademik makale analizleri için ideal sessiz alan.',
    imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&auto=format&fit=crop&q=80'
  },
  {
    name: 'Grup Oda C - Yazılım & Donanım Laboratuvarı (8 Kişilik)',
    capacity: 8,
    equipment: 'Çift Monitörlü 2 Bilgisayar, Akıllı Ekran, 8 Priz, Wi-Fi',
    description: 'Yazılım geliştirme, robotik projelendirme ve büyük ölçekli takım çalışmaları odası.',
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&auto=format&fit=crop&q=80'
  }
];

export const getAllStudyRooms = async (req: Request, res: Response): Promise<void> => {
  try {
    let rooms = await prisma.studyRoom.findMany({
      include: {
        studyRoomReservations: {
          where: { status: 'ACTIVE' },
          include: { user: { select: { fullName: true, email: true } } }
        }
      }
    });

    if (rooms.length === 0) {
      // Auto seed default 3 study rooms
      for (const r of DEFAULT_STUDY_ROOMS) {
        await prisma.studyRoom.create({ data: r });
      }
      rooms = await prisma.studyRoom.findMany({
        include: {
          studyRoomReservations: {
            where: { status: 'ACTIVE' },
            include: { user: { select: { fullName: true, email: true } } }
          }
        }
      });
    }

    res.status(200).json({
      status: 'success',
      data: { studyRooms: rooms }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Grup çalışma odaları alınırken hata oluştu.',
      error: error.message
    });
  }
};

export const getUserStudyRoomReservations = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Oturum bulunamadı.' });
      return;
    }

    const reservations = await prisma.studyRoomReservation.findMany({
      where: { userId: req.user.userId },
      include: {
        studyRoom: true
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
      message: 'Grup oda rezervasyonları alınırken hata oluştu.',
      error: error.message
    });
  }
};

export const reserveStudyRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Oturum bulunamadı.' });
      return;
    }

    const {
      studyRoomId,
      reservationDate,
      startTime,
      endTime,
      durationHours,
      participantCount,
      groupEmails,
      purpose
    } = req.body;

    if (!studyRoomId || !reservationDate || !startTime || !endTime) {
      res.status(400).json({
        status: 'error',
        message: 'Oda seçimi, rezervasyon tarihi ve başlama/bitiş saatleri zorunludur.'
      });
      return;
    }

    const studyRoom = await prisma.studyRoom.findUnique({
      where: { id: studyRoomId }
    });

    if (!studyRoom) {
      res.status(404).json({ status: 'error', message: 'Seçilen grup çalışma odası bulunamadı.' });
      return;
    }

    const resDate = new Date(reservationDate);

    // TIME CONFLICT CHECK (Çakışan saat rezervasyonu engelleme)
    const existingConflicts = await prisma.studyRoomReservation.findMany({
      where: {
        studyRoomId,
        status: 'ACTIVE',
        reservationDate: {
          gte: new Date(resDate.setHours(0, 0, 0, 0)),
          lte: new Date(resDate.setHours(23, 59, 59, 999))
        }
      }
    });

    const hasConflict = existingConflicts.some((exist) => {
      // Simple HH:MM comparison
      const newStart = startTime.replace(':', '');
      const newEnd = endTime.replace(':', '');
      const existStart = exist.startTime.replace(':', '');
      const existEnd = exist.endTime.replace(':', '');

      return newStart < existEnd && newEnd > existStart;
    });

    if (hasConflict) {
      res.status(409).json({
        status: 'error',
        message: 'Seçilen oda ve saat diliminde başka bir aktif grup rezervasyonu bulunmaktadır.'
      });
      return;
    }

    // Create Reservation
    const newReservation = await prisma.studyRoomReservation.create({
      data: {
        studyRoomId,
        userId: req.user.userId,
        reservationDate: new Date(reservationDate),
        startTime,
        endTime,
        durationHours: Number(durationHours) || 2,
        participantCount: Number(participantCount) || 4,
        groupEmails: groupEmails || null,
        purpose: purpose || 'Grup Proje Çalışması',
        status: 'ACTIVE'
      },
      include: {
        studyRoom: true
      }
    });

    // Send Notification to student
    createNotification(
      req.user.userId,
      '🏢 Grup Çalışma Odası Rezervasyonu Onaylandı',
      `${studyRoom.name} için ${new Date(reservationDate).toLocaleDateString('tr-TR')} tarihinde ${startTime} - ${endTime} saatleri arasında grup rezervasyonunuz oluşturuldu.`,
      'RESERVATION'
    );

    res.status(201).json({
      status: 'success',
      message: 'Grup çalışma odası rezervasyonunuz başarıyla oluşturuldu.',
      data: { reservation: newReservation }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Grup çalışma odası rezervasyonu oluşturulurken hata oluştu.',
      error: error.message
    });
  }
};

export const cancelStudyRoomReservation = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Oturum bulunamadı.' });
      return;
    }

    const { id } = req.params;

    const reservation = await prisma.studyRoomReservation.findUnique({
      where: { id }
    });

    if (!reservation) {
      res.status(404).json({ status: 'error', message: 'Rezervasyon bulunamadı.' });
      return;
    }

    if (reservation.userId !== req.user.userId && req.user.role !== 'ADMIN' && req.user.role !== 'LIBRARIAN') {
      res.status(403).json({ status: 'error', message: 'Bu rezervasyonu iptal etme yetkiniz yok.' });
      return;
    }

    const updated = await prisma.studyRoomReservation.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });

    res.status(200).json({
      status: 'success',
      message: 'Grup oda rezervasyonunuz iptal edildi.',
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

// ADMIN: Create Study Room
export const createStudyRoomByAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, capacity, equipment, description, imageUrl } = req.body;

    if (!name || !capacity) {
      res.status(400).json({ status: 'error', message: 'Oda adı ve kapasite zorunludur.' });
      return;
    }

    const newRoom = await prisma.studyRoom.create({
      data: {
        name,
        capacity: Number(capacity),
        equipment: equipment || 'Akıllı Tahta, Projeksiyon, Wi-Fi',
        description: description || 'Grup çalışma odası',
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=80',
        isAvailable: true
      }
    });

    res.status(201).json({
      status: 'success',
      message: `"${name}" grup çalışma odası başarıyla oluşturuldu.`,
      data: { studyRoom: newRoom }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Grup oda eklenirken hata oluştu.',
      error: error.message
    });
  }
};

// ADMIN: Update Study Room
export const updateStudyRoomByAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, capacity, equipment, description, imageUrl, isAvailable } = req.body;

    const existing = await prisma.studyRoom.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ status: 'error', message: 'Grup odası bulunamadı.' });
      return;
    }

    const updated = await prisma.studyRoom.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(capacity !== undefined && { capacity: Number(capacity) }),
        ...(equipment !== undefined && { equipment }),
        ...(description !== undefined && { description }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(isAvailable !== undefined && { isAvailable: Boolean(isAvailable) })
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Grup odası bilgileri güncellendi.',
      data: { studyRoom: updated }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Grup oda güncellenirken hata oluştu.',
      error: error.message
    });
  }
};

// ADMIN: Delete Study Room
export const deleteStudyRoomByAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.studyRoom.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ status: 'error', message: 'Grup odası bulunamadı.' });
      return;
    }

    // Delete associated reservations first
    await prisma.studyRoomReservation.deleteMany({ where: { studyRoomId: id } });
    await prisma.studyRoom.delete({ where: { id } });

    res.status(200).json({
      status: 'success',
      message: `"${existing.name}" grup çalışma odası silindi.`
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Grup oda silinirken hata oluştu.',
      error: error.message
    });
  }
};
