'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
  Calendar,
  Clock,
  Zap,
  ZapOff,
  CheckCircle2,
  XCircle,
  Building,
  UserCheck,
  AlertCircle,
  BookmarkCheck,
  MapPin,
  RefreshCw,
  Info,
  X,
  QrCode,
  LogOut,
  Sparkles,
  Camera
} from 'lucide-react';
import WebcamScannerModal from '@/components/WebcamScannerModal';

interface Desk {
  id: string;
  roomId: string;
  deskNumber: string;
  xPosition: number;
  yPosition: number;
  isAvailable: boolean;
  hasPowerOutlet: boolean;
  isOccupied?: boolean;
  occupiedBy?: string | null;
}

interface Room {
  id: string;
  name: string;
  capacity: number;
  description?: string;
  desks: Desk[];
}

interface DeskReservationItem {
  id: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  status: string;
  isCheckedIn: boolean;
  createdAt?: string;
  desk: {
    deskNumber: string;
    hasPowerOutlet: boolean;
    room: {
      name: string;
    };
  };
}

const TIME_SLOTS = [
  { start: '09:00', end: '12:00', label: 'Sabah (09:00 - 12:00)' },
  { start: '12:00', end: '15:00', label: 'Öğle (12:00 - 15:00)' },
  { start: '15:00', end: '18:00', label: 'İkindi (15:00 - 18:00)' },
  { start: '18:00', end: '21:00', label: 'Akşam (18:00 - 21:00)' }
];

function ReservationCountdownTimer({ createdAt, onExpire }: { createdAt?: string; onExpire?: () => void }) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!createdAt) return;
    const createdTime = new Date(createdAt).getTime();
    const FIFTEEN_MINS_MS = 15 * 60 * 1000;
    const expireTime = createdTime + FIFTEEN_MINS_MS;

    const updateTimer = () => {
      const remainingMs = expireTime - Date.now();
      if (remainingMs <= 0) {
        setTimeLeft(0);
        if (onExpire) onExpire();
      } else {
        setTimeLeft(Math.floor(remainingMs / 1000));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [createdAt, onExpire]);

  if (!createdAt || timeLeft <= 0) {
    return (
      <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded border border-rose-200 text-xs">
        <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> 15 Dk Süre Doldu (İptal Ediliyor)
      </span>
    );
  }

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return (
    <span className="inline-flex items-center gap-1 font-mono font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 text-xs animate-pulse">
      <Clock className="w-3.5 h-3.5 text-amber-600" />
      Check-In Kalan Süre: <strong className="text-amber-900 text-sm font-black">{formatted}</strong>
    </span>
  );
}

interface StudyRoomItem {
  id: string;
  name: string;
  capacity: number;
  description?: string;
  equipment?: string;
  imageUrl?: string;
  isAvailable: boolean;
  studyRoomReservations?: any[];
}

const DEFAULT_FALLBACK_STUDY_ROOMS: StudyRoomItem[] = [
  {
    id: 'room-1',
    name: 'Oda 1 - Proje Çalışma Salonu (6 Kişilik)',
    capacity: 6,
    equipment: 'Akıllı Tahta, Projeksiyon, 6 Adet Priz, Yüksek Hızlı Wi-Fi',
    description: 'Proje takımları ve grup sunum çalışmaları için tam donanımlı ses yalıtımlı çalışma odası.',
    imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=80',
    isAvailable: true
  },
  {
    id: 'room-2',
    name: 'Oda 2 - Sessiz Grup Çalışma (4 Kişilik)',
    capacity: 4,
    equipment: 'Yazı Tahtası, 4 Adet Priz, Wi-Fi, Ergonomik Koltuklar',
    description: 'Odaklanmış küçük grup tartışmaları ve akademik makale analizleri için ideal sessiz alan.',
    imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&auto=format&fit=crop&q=80',
    isAvailable: true
  },
  {
    id: 'room-3',
    name: 'Oda 3 - Akıllı Tahtalı Sunum Odası (8 Kişilik)',
    capacity: 8,
    equipment: 'Çift Monitörlü 2 Bilgisayar, Akıllı Ekran, 8 Priz, Wi-Fi',
    description: 'Yazılım geliştirme, robotik projelendirme ve büyük ölçekli takım çalışmaları odası.',
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&auto=format&fit=crop&q=80',
    isAvailable: true
  }
];

export default function DeskReservationPage() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'map' | 'study-rooms' | 'my-reservations'>('map');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);

  const [desksWithStatus, setDesksWithStatus] = useState<Desk[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  // Study Rooms State
  const [studyRooms, setStudyRooms] = useState<StudyRoomItem[]>([]);
  const [loadingStudyRooms, setLoadingStudyRooms] = useState(false);
  const [selectedStudyRoom, setSelectedStudyRoom] = useState<StudyRoomItem | null>(null);

  // Study Room Reservation Form State
  const [studyResDate, setStudyResDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [studyStartTime, setStudyStartTime] = useState<string>('10:00');
  const [studyEndTime, setStudyEndTime] = useState<string>('12:00');
  const [studyDuration, setStudyDuration] = useState<number>(2);
  const [studyParticipantCount, setStudyParticipantCount] = useState<number>(4);
  const [studyGroupEmails, setStudyGroupEmails] = useState<string>('');
  const [studyPurpose, setStudyPurpose] = useState<string>('Yazılım & Proje Çalışması');
  const [reservingStudyRoom, setReservingStudyRoom] = useState(false);
  const [studyResError, setStudyResError] = useState<string | null>(null);

  // Reservation Modal State
  const [selectedDesk, setSelectedDesk] = useState<Desk | null>(null);
  const [reserving, setReserving] = useState(false);
  const [resError, setResError] = useState<string | null>(null);
  const [resSuccess, setResSuccess] = useState<string | null>(null);

  // My Desk Reservations State
  const [myReservations, setMyReservations] = useState<DeskReservationItem[]>([]);
  const [myStudyReservations, setMyStudyReservations] = useState<any[]>([]);
  const [loadingMyRes, setLoadingMyRes] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [checkingOutId, setCheckingOutId] = useState<string | null>(null);
  const [showQrCameraScanner, setShowQrCameraScanner] = useState(false);

  // QR Modal State
  const [selectedQrRes, setSelectedQrRes] = useState<DeskReservationItem | null>(null);

  useEffect(() => {
    fetchRooms();
    fetchStudyRooms();
  }, []);

  useEffect(() => {
    if (selectedRoomId && selectedDate) {
      fetchAvailability();
    }
  }, [selectedRoomId, selectedDate, selectedSlotIndex]);

  useEffect(() => {
    if (activeTab === 'study-rooms') {
      fetchStudyRooms();
    } else if (activeTab === 'my-reservations' && isAuthenticated) {
      fetchMyReservations();
      fetchMyStudyReservations();
    }
  }, [activeTab, isAuthenticated]);

  const fetchRooms = async () => {
    try {
      const res = await api.get('/desks/rooms');
      if (res.data?.data?.rooms) {
        setRooms(res.data.data.rooms);
        if (res.data.data.rooms.length > 0) {
          setSelectedRoomId(res.data.data.rooms[0].id);
        }
      }
    } catch (err) {
      console.error('Salonlar çekilemedi:', err);
    }
  };

  const fetchStudyRooms = async () => {
    setLoadingStudyRooms(true);
    try {
      const res = await api.get('/study-rooms');
      if (res.data?.data?.studyRooms) {
        setStudyRooms(res.data.data.studyRooms);
      }
    } catch (err) {
      console.error('Grup çalışma odaları çekilemedi:', err);
    } finally {
      setLoadingStudyRooms(false);
    }
  };

  const fetchAvailability = async () => {
    setLoadingAvailability(true);
    try {
      const slot = TIME_SLOTS[selectedSlotIndex];
      const res = await api.get(
        `/desks/availability?roomId=${selectedRoomId}&date=${selectedDate}&startTime=${slot.start}&endTime=${slot.end}`
      );
      if (res.data?.data?.desks) {
        setDesksWithStatus(res.data.data.desks);
      }
    } catch (err) {
      console.error('Masa doluluk durumu çekilemedi:', err);
    } finally {
      setLoadingAvailability(false);
    }
  };

  const fetchMyReservations = async () => {
    setLoadingMyRes(true);
    try {
      const res = await api.get('/desks/my-reservations');
      if (res.data?.data?.reservations) {
        setMyReservations(res.data.data.reservations);
      }
    } catch (err) {
      console.error('Rezervasyonlarım çekilemedi:', err);
    } finally {
      setLoadingMyRes(false);
    }
  };

  const fetchMyStudyReservations = async () => {
    try {
      const res = await api.get('/study-rooms/my-reservations');
      if (res.data?.data?.reservations) {
        setMyStudyReservations(res.data.data.reservations);
      }
    } catch (err) {
      console.error('Grup rezervasyonlarım çekilemedi:', err);
    }
  };

  const handleConfirmStudyRoomReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudyRoom) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    setReservingStudyRoom(true);
    setStudyResError(null);

    try {
      await api.post('/study-rooms/reserve', {
        studyRoomId: selectedStudyRoom.id,
        reservationDate: studyResDate,
        startTime: studyStartTime,
        endTime: studyEndTime,
        durationHours: studyDuration,
        participantCount: studyParticipantCount,
        groupEmails: studyGroupEmails,
        purpose: studyPurpose
      });

      setResSuccess(`"${selectedStudyRoom.name}" için grup rezervasyonunuz başarıyla onaylandı.`);
      setSelectedStudyRoom(null);
      fetchStudyRooms();
    } catch (err: any) {
      setStudyResError(
        err.response?.data?.message || 'Grup çalışma odası rezervasyonu sırasında hata oluştu.'
      );
    } finally {
      setReservingStudyRoom(false);
    }
  };

  const handleOpenConfirmModal = (desk: Desk) => {
    if (desk.isOccupied) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    setResError(null);
    setResSuccess(null);
    setSelectedDesk(desk);
  };

  const handleConfirmReservation = async () => {
    if (!selectedDesk) return;
    setReserving(true);
    setResError(null);

    const slot = TIME_SLOTS[selectedSlotIndex];

    try {
      const res = await api.post('/desks/reserve', {
        deskId: selectedDesk.id,
        date: selectedDate,
        startTime: slot.start,
        endTime: slot.end
      });

      if (res.data?.status === 'success') {
        setResSuccess('🎉 Masa rezervasyonunuz başarıyla oluşturuldu! E-posta onayınız gönderildi.');
        setTimeout(() => {
          setSelectedDesk(null);
          fetchAvailability();
        }, 1500);
      }
    } catch (err: any) {
      setResError(err.response?.data?.message || 'Rezervasyon işlemi başarısız oldu.');
    } finally {
      setReserving(false);
    }
  };

  const handleCancelReservation = async (id: string) => {
    if (!confirm('Bu masa rezervasyonunu iptal etmek istediğinize emin misiniz?')) return;
    setCancelingId(id);
    try {
      await api.patch(`/desks/reservations/${id}/cancel`);
      fetchMyReservations();
    } catch (err: any) {
      alert(err.response?.data?.message || 'İptal edilemedi.');
    } finally {
      setCancelingId(null);
    }
  };

  const handleCheckIn = async (resId: string) => {
    setCheckingInId(resId);
    try {
      const res = await api.post(`/desks/reservations/${resId}/check-in`);
      alert(res.data?.message || 'Masaya check-in yapıldı. Oturumunuz aktif!');
      fetchMyReservations();
      if (selectedQrRes?.id === resId) {
        setSelectedQrRes(null);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Check-in yapılırken hata oluştu.');
    } finally {
      setCheckingInId(null);
    }
  };

  const handleCheckOut = async (resId: string) => {
    if (!confirm('Masadan ayrılmak ve masayı serbest bırakmak istediğinize emin misiniz?')) return;
    setCheckingOutId(resId);
    try {
      const res = await api.post(`/desks/reservations/${resId}/check-out`);
      alert(res.data?.message || 'Masa başarıyla serbest bırakıldı.');
      fetchMyReservations();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Check-out yapılırken hata oluştu.');
    } finally {
      setCheckingOutId(null);
    }
  };

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16 pt-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* HEADER & HERO SECTION - KURUMSAL AÇIK TEMA */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 text-slate-900 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold uppercase tracking-wider">
              <Building className="w-3.5 h-3.5 text-blue-600" /> İnteraktif Çalışma Masası & QR Check-In
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Çalışma Masası & QR Check-In Sistemi
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
              Kütüphanemizdeki 90 masa arasından prizli masanızı seçin, rezervasyon yapın ve salon vardığınızda QR kod okutarak veya tek tıkla masaya oturup boşaltın.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 z-10">
            <button
              onClick={() => setActiveTab('map')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-2 ${
                activeTab === 'map'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <MapPin className="w-4 h-4 text-blue-400" /> Bireysel Masa Haritası
            </button>

            <button
              onClick={() => setActiveTab('study-rooms')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-2 ${
                activeTab === 'study-rooms'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Building className="w-4 h-4 text-amber-500" /> Grup Çalışma Odaları (4-8 Kişilik)
            </button>

            <button
              onClick={() => setActiveTab('my-reservations')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-2 ${
                activeTab === 'my-reservations'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Calendar className="w-4 h-4 text-emerald-400" /> Aktif Rezervasyonlarım ({myReservations.length + myStudyReservations.length})
            </button>
          </div>
        </div>

        {/* TAB 1: INTERACTIVE MAP & RESERVATION */}
        {activeTab === 'map' && (
          <div className="space-y-6">
            {/* CONTROLS BAR: ROOM, DATE & TIME SLOT SELECTOR */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" /> Rezervasyon Zamanı ve Salon Seçimi
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Room Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-500" /> Çalışma Salonu
                  </label>
                  <select
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-900"
                  >
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name} ({room.capacity} Masa)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" /> Rezervasyon Tarihi
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>

                {/* Slot Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" /> Saat Aralığı (Slot)
                  </label>
                  <select
                    value={selectedSlotIndex}
                    onChange={(e) => setSelectedSlotIndex(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-900"
                  >
                    {TIME_SLOTS.map((slot, idx) => (
                      <option key={slot.label} value={idx}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedRoom?.description && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>{selectedRoom.description}</span>
                </div>
              )}
            </div>

            {/* COLOR LEGEND BAR */}
            <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-emerald-500 shadow-sm" />
                  <span className="font-bold text-slate-700">Boş (Uygun Masa)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-rose-500 shadow-sm" />
                  <span className="font-bold text-slate-700">Dolu (Rezerve Edilmiş)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="font-medium text-slate-600">🔌 Priz Donanımlı Masa</span>
                </div>
              </div>

              <button
                onClick={fetchAvailability}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingAvailability ? 'animate-spin' : ''}`} /> Yenile
              </button>
            </div>

            {/* INTERACTIVE DESK KROKI / GRID MAP */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {selectedRoom?.name} - Canlı Masa Yerleşimi
                  </h3>
                  <span className="text-xs text-slate-500">
                    {selectedDate} tarihi {TIME_SLOTS[selectedSlotIndex].label} saati için masa haritası.
                  </span>
                </div>

                <div className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
                  Toplam Masa: {desksWithStatus.length}
                </div>
              </div>

              {loadingAvailability ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="text-xs font-bold">Masa durumları güncelleniyor...</span>
                </div>
              ) : desksWithStatus.length === 0 ? (
                <div className="py-16 text-center text-slate-500 text-xs">
                  Bu salonda tanımlı masa bulunamadı.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {desksWithStatus.map((desk) => {
                    const isOccupied = desk.isOccupied;

                    return (
                      <div
                        key={desk.id}
                        onClick={() => handleOpenConfirmModal(desk)}
                        className={`group relative p-5 rounded-2xl border-2 transition-all cursor-pointer shadow-sm flex flex-col items-center justify-center text-center gap-2.5 ${
                          isOccupied
                            ? 'bg-rose-50 border-rose-300 text-rose-900 cursor-not-allowed opacity-80'
                            : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-950 hover:scale-105 hover:shadow-md'
                        }`}
                        title={
                          isOccupied
                            ? `Masa ${desk.deskNumber} - Rezerve Eden: ${desk.occupiedBy || 'Dolu'}`
                            : `Masa ${desk.deskNumber} - Rezervasyon Yapmak İçin Tıklayın`
                        }
                      >
                        {/* Power Outlet Badge */}
                        <div className="absolute top-2.5 right-2.5">
                          {desk.hasPowerOutlet ? (
                            <span className="p-1 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center gap-0.5" title="220V Priz Var">
                              <Zap className="w-3 h-3 fill-amber-500 text-amber-600" />
                            </span>
                          ) : (
                            <span className="p-1 rounded-md bg-slate-200 text-slate-500 text-[10px] font-bold" title="Priz Yok">
                              <ZapOff className="w-3 h-3" />
                            </span>
                          )}
                        </div>

                        {/* Desk Icon & Number */}
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-base shadow-sm ${
                            isOccupied
                              ? 'bg-rose-500 text-white'
                              : 'bg-emerald-600 text-white group-hover:bg-emerald-700'
                          }`}
                        >
                          {desk.deskNumber}
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-xs font-bold block">
                            {isOccupied ? 'DOLU' : 'BOŞ (UYGUN)'}
                          </span>
                          <span className="text-[10px] opacity-75 font-medium block">
                            {desk.hasPowerOutlet ? '🔌 Priz Donanımlı' : 'Priz Bulunmuyor'}
                          </span>
                        </div>

                        {isOccupied && desk.occupiedBy && (
                          <div className="w-full pt-1 border-t border-rose-200 text-[9px] font-semibold text-rose-700 line-clamp-1">
                            {desk.occupiedBy}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: GRUP ÇALIŞMA ODALARI (4-8 KİŞİLİK) */}
        {activeTab === 'study-rooms' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Building className="w-5 h-5 text-amber-500" /> Grup Çalışma Odaları & Proje Salonları
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  4-8 kişilik gruplar için ses yalıtımlı akıllı projeksiyonlu ve ekranlı çalışma odaları. Saatlik randevu alabilirsiniz.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                  3 Adet Aktif Oda
                </span>
              </div>
            </div>

            {/* STUDY ROOMS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(studyRooms.length > 0 ? studyRooms : DEFAULT_FALLBACK_STUDY_ROOMS).map((room) => (
                <div
                  key={room.id}
                  className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:border-amber-400 transition-all group"
                >
                  <div className="space-y-3">
                    {/* Room Image */}
                    <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                      <img
                        src={room.imageUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=80'}
                        alt={room.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                      />
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-amber-300 text-[10px] font-extrabold border border-amber-400/40">
                        👥 {room.capacity} Kişilik Kapasite
                      </div>
                    </div>

                    {/* Room Details */}
                    <div className="p-5 space-y-2.5">
                      <h3 className="text-base font-extrabold text-slate-900 leading-snug">{room.name}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">{room.description}</p>
                      
                      <div className="pt-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          🧰 Oda Donanımları:
                        </span>
                        <p className="text-[11px] font-medium text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          {room.equipment}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 pt-0">
                    <button
                      onClick={() => setSelectedStudyRoom(room)}
                      className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 group-hover:bg-amber-500 group-hover:text-slate-950"
                    >
                      <Calendar className="w-4 h-4" /> Grup Odasını Rezerve Et
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: MY DESK RESERVATIONS & QR CHECK-IN */}
        {activeTab === 'my-reservations' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Masa Rezervasyonlarım & QR Check-In</h3>
                <span className="text-xs text-slate-500">
                  Rezervasyon yaptığınız masalara canlı QR kod okutarak veya butonla Check-In / Check-Out yapabilirsiniz.
                </span>
              </div>

              <button
                onClick={fetchMyReservations}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingMyRes ? 'animate-spin' : ''}`} /> Yenile
              </button>
            </div>

            {!isAuthenticated ? (
              <div className="py-12 text-center space-y-3">
                <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Rezervasyonlarınızı görmek için lütfen giriş yapın.</p>
                <button
                  onClick={() => router.push('/login')}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
                >
                  Giriş Yap
                </button>
              </div>
            ) : loadingMyRes ? (
              <div className="py-16 text-center text-slate-400 text-xs font-bold">Yükleniyor...</div>
            ) : myReservations.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs font-medium">
                Henüz yapılmış masa rezervasyonunuz bulunmamaktadır.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Salon & Masa No</th>
                      <th className="px-4 py-3">Tarih</th>
                      <th className="px-4 py-3">Saat Aralığı</th>
                      <th className="px-4 py-3">Masa Oturum Durumu</th>
                      <th className="px-4 py-3 text-right">QR & Check-In İşlemleri</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {myReservations.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-bold text-slate-900">
                          <div>{r.desk.room.name}</div>
                          <span className="text-[10px] text-blue-600 font-mono font-bold">Masa: {r.desk.deskNumber}</span>
                        </td>

                        <td className="px-4 py-3 font-semibold text-slate-700">
                          {new Date(r.reservationDate).toLocaleDateString('tr-TR')}
                        </td>

                        <td className="px-4 py-3 font-bold text-slate-900">
                          {r.startTime} - {r.endTime}
                        </td>

                        <td className="px-4 py-3">
                          {r.status === 'COMPLETED' ? (
                            <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold text-[10px] border border-slate-200">
                              TAMAMLANDI (BOŞALTILDI)
                            </span>
                          ) : r.status === 'CANCELLED' ? (
                            <span className="px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold text-[10px] border border-rose-200">
                              İPTAL EDİLDİ
                            </span>
                          ) : r.isCheckedIn ? (
                            <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-extrabold text-[10px] border border-emerald-300 inline-flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-emerald-600" /> MASADA OTURUYOR
                            </span>
                          ) : (
                            <div className="space-y-1">
                              <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold text-[10px] border border-amber-200 block w-max">
                                BEKLİYOR (CHECK-IN YAPILMADI)
                              </span>
                              <ReservationCountdownTimer createdAt={r.createdAt} onExpire={fetchMyReservations} />
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right space-x-2">
                          {r.status === 'ACTIVE' && (
                            <>
                              {/* QR Code Modal Trigger */}
                              <button
                                onClick={() => setSelectedQrRes(r)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs inline-flex items-center gap-1 shadow-sm"
                                title="QR Kod Okut"
                              >
                                <QrCode className="w-3.5 h-3.5 text-blue-400" /> QR Kod
                              </button>

                              {!r.isCheckedIn ? (
                                <button
                                  disabled={checkingInId === r.id}
                                  onClick={() => handleCheckIn(r.id)}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1 shadow-sm disabled:opacity-50"
                                >
                                  {checkingInId === r.id ? 'İşleniyor...' : '📱 Masaya Otur (Check-In)'}
                                </button>
                              ) : (
                                <button
                                  disabled={checkingOutId === r.id}
                                  onClick={() => handleCheckOut(r.id)}
                                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs inline-flex items-center gap-1 shadow-sm disabled:opacity-50"
                                >
                                  {checkingOutId === r.id ? 'Boşaltılıyor...' : '🚪 Masayı Boşalt (Check-Out)'}
                                </button>
                              )}

                              <button
                                disabled={cancelingId === r.id}
                                onClick={() => handleCancelReservation(r.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs disabled:opacity-50"
                              >
                                İptal
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* RESERVATION CONFIRMATION MODAL */}
      {selectedDesk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md p-6 rounded-2xl border border-slate-200 shadow-xl space-y-5 relative">
            <button
              onClick={() => setSelectedDesk(null)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">Masa Rezervasyon Onayı</h3>
              <p className="text-xs text-slate-500">Lütfen rezervasyon bilgilerinizi kontrol edip onaylayın.</p>
            </div>

            {resError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{resError}</span>
              </div>
            )}

            {resSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{resSuccess}</span>
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs text-slate-700">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="font-semibold text-slate-500">Çalışma Salonu:</span>
                <span className="font-bold text-slate-900">{selectedRoom?.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="font-semibold text-slate-500">Masa Numarası:</span>
                <span className="font-extrabold text-blue-700 font-mono text-sm">{selectedDesk.deskNumber}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="font-semibold text-slate-500">Rezervasyon Tarihi:</span>
                <span className="font-bold text-slate-900">{selectedDate}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="font-semibold text-slate-500">Saat Aralığı:</span>
                <span className="font-bold text-slate-900">{TIME_SLOTS[selectedSlotIndex].label}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Priz Donanımı:</span>
                <span className="font-bold text-amber-700">
                  {selectedDesk.hasPowerOutlet ? '🔌 220V Priz Mevcut' : 'Priz Bulunmuyor'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedDesk(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Vazgeç
              </button>
              <button
                disabled={reserving || !!resSuccess}
                onClick={handleConfirmReservation}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {reserving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Onaylanıyor...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Rezervasyonu Onayla
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STUDY ROOM RESERVATION MODAL */}
      {selectedStudyRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xl space-y-6 relative overflow-hidden">
            <button
              onClick={() => setSelectedStudyRoom(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 font-bold text-[10px] border border-amber-200 uppercase tracking-wider inline-block">
                🏢 Grup Çalışma Odası Randevusu
              </span>
              <h3 className="text-xl font-extrabold text-slate-900">{selectedStudyRoom.name}</h3>
              <p className="text-xs text-slate-500">Maksimum Kapasite: {selectedStudyRoom.capacity} Öğrenci</p>
            </div>

            {studyResError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{studyResError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmStudyRoomReserve} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700">Rezervasyon Tarihi</label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={studyResDate}
                    onChange={(e) => setStudyResDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700">Kullanım Süresi</label>
                  <select
                    value={studyDuration}
                    onChange={(e) => setStudyDuration(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value={1}>1 Saat</option>
                    <option value={2}>2 Saat (Önerilen)</option>
                    <option value={3}>3 Saat (Maksimum)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700">Başlangıç Saati</label>
                  <input
                    type="time"
                    required
                    value={studyStartTime}
                    onChange={(e) => setStudyStartTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700">Bitiş Saati</label>
                  <input
                    type="time"
                    required
                    value={studyEndTime}
                    onChange={(e) => setStudyEndTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700">Katılımcı Sayısı</label>
                  <select
                    value={studyParticipantCount}
                    onChange={(e) => setStudyParticipantCount(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {[...Array(selectedStudyRoom.capacity)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1} Kişi
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700">Çalışma Konusu / Amacı</label>
                  <input
                    type="text"
                    value={studyPurpose}
                    onChange={(e) => setStudyPurpose(e.target.value)}
                    placeholder="Yazılım Projesi Sunumu"
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700">Gruptaki Öğrenci E-Postaları / Öğrenci No</label>
                <textarea
                  rows={2}
                  value={studyGroupEmails}
                  onChange={(e) => setStudyGroupEmails(e.target.value)}
                  placeholder="ahmet@ogrenci.edu.tr, ayse@ogrenci.edu.tr, 20210045"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedStudyRoom(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  İptal
                </button>

                <button
                  type="submit"
                  disabled={reservingStudyRoom}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {reservingStudyRoom ? 'Onaylanıyor...' : 'Grup Rezervasyonunu Tamamla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR CODE MODAL FOR CHECK-IN */}
      {selectedQrRes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm p-6 rounded-3xl border border-slate-200 shadow-2xl space-y-6 text-center relative">
            <button
              onClick={() => setSelectedQrRes(null)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200 uppercase tracking-wider inline-block">
                📱 Dijital Masa Giriş QR Kodu
              </span>
              <h3 className="text-lg font-extrabold text-slate-900">{selectedQrRes.desk.room.name}</h3>
              <p className="text-xs font-mono font-bold text-blue-600">Masa No: {selectedQrRes.desk.deskNumber}</p>
            </div>

            {/* DYNAMIC QR CODE DISPLAY */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center space-y-3">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  `${typeof window !== 'undefined' ? window.location.origin : ''}/check-in?reservationId=${selectedQrRes.id}`
                )}`}
                alt="Masa Check-In QR Kodu"
                className="w-48 h-48 rounded-xl shadow-md border-4 border-white bg-white"
              />
              <span className="text-[10px] text-slate-500 font-medium">
                Telefon kameranız ile QR kodu okutarak veya aşağıdaki butonla check-in yapabilirsiniz.
              </span>
            </div>

            <div className="space-y-2">
              {!selectedQrRes.isCheckedIn ? (
                <>
                  <button
                    onClick={() => handleCheckIn(selectedQrRes.id)}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" /> Masaya Otur (Check-In Yap)
                  </button>

                  <button
                    onClick={() => setShowQrCameraScanner(true)}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all"
                  >
                    <Camera className="w-4 h-4 text-amber-400" /> Kamera ile QR Kod Okut
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleCheckOut(selectedQrRes.id)}
                  className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> Masayı Boşalt (Check-Out Yap)
                </button>
              )}

              <button
                onClick={() => setSelectedQrRes(null)}
                className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WEBCAM QR SCANNER MODAL */}
      <WebcamScannerModal
        isOpen={showQrCameraScanner}
        onClose={() => setShowQrCameraScanner(false)}
        onScanSuccess={(scannedText) => {
          if (selectedQrRes) {
            handleCheckIn(selectedQrRes.id);
          }
        }}
        title="📷 Masa Check-In QR Kodu Okut"
        description="Masada veya ekranda bulunan QR kodunu kameranıza yaklaştırarak anında masaya oturabilirsiniz."
      />
    </div>
  );
}
