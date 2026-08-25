'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import {
  Building,
  PlusCircle,
  Trash2,
  Zap,
  ZapOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Search,
  SlidersHorizontal,
  ChevronLeft
} from 'lucide-react';

interface Desk {
  id: string;
  roomId: string;
  deskNumber: string;
  xPosition: number;
  yPosition: number;
  isAvailable: boolean;
  hasPowerOutlet: boolean;
  room?: {
    name: string;
  };
}

interface Room {
  id: string;
  name: string;
  capacity: number;
  description?: string;
  desks: Desk[];
}

export default function AdminDesksPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [adminTab, setAdminTab] = useState<'desks' | 'study-rooms'>('desks');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [studyRoomsList, setStudyRoomsList] = useState<any[]>([]);
  const [studyReservationsList, setStudyReservationsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Desk Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    roomId: '',
    deskNumber: '',
    xPosition: 1,
    yPosition: 1,
    hasPowerOutlet: true
  });

  // Add/Edit Study Room Modal State
  const [showStudyRoomModal, setShowStudyRoomModal] = useState(false);
  const [editingStudyRoom, setEditingStudyRoom] = useState<any | null>(null);
  const [studyRoomForm, setStudyRoomForm] = useState({
    name: '',
    capacity: 6,
    equipment: 'Akıllı Tahta, Projeksiyon, 6 Adet Priz, Yüksek Hızlı Wi-Fi',
    description: 'Proje takımları ve grup çalışmaları için tam donanımlı oda.',
    imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=80'
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || (user?.role !== 'ADMIN' && user?.role !== 'LIBRARIAN')) {
        router.push('/login');
        return;
      }
      fetchRooms();
      fetchStudyRoomsData();
    }
  }, [isAuthenticated, isLoading, user, router]);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res = await api.get('/desks/rooms');
      if (res.data?.data?.rooms) {
        setRooms(res.data.data.rooms);
        if (res.data.data.rooms.length > 0 && !addForm.roomId) {
          setAddForm((prev) => ({ ...prev, roomId: res.data.data.rooms[0].id }));
        }
      }
    } catch (err) {
      console.error('Salonlar yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudyRoomsData = async () => {
    try {
      const res = await api.get('/study-rooms');
      if (res.data?.data?.studyRooms) {
        setStudyRoomsList(res.data.data.studyRooms);
        // Flatten active reservations
        const activeResList = res.data.data.studyRooms.flatMap((r: any) =>
          (r.studyRoomReservations || []).map((resItem: any) => ({
            ...resItem,
            roomName: r.name
          }))
        );
        setStudyReservationsList(activeResList);
      }
    } catch (err) {
      console.error('Grup çalışma odaları yüklenemedi:', err);
    }
  };

  const handleCancelStudyReservation = async (reservationId: string) => {
    if (!confirm('Bu grup oda rezervasyonunu iptal etmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/study-rooms/reservations/${reservationId}`);
      setSuccessMsg('Grup oda rezervasyonu başarıyla iptal edildi.');
      fetchStudyRoomsData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Rezervasyon iptal edilirken hata oluştu.');
    }
  };

  const openCreateStudyRoomModal = () => {
    setEditingStudyRoom(null);
    setStudyRoomForm({
      name: '',
      capacity: 6,
      equipment: 'Akıllı Tahta, Projeksiyon, 6 Adet Priz, Yüksek Hızlı Wi-Fi',
      description: 'Proje takımları ve grup çalışmaları için tam donanımlı oda.',
      imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=80'
    });
    setErrorMsg(null);
    setShowStudyRoomModal(true);
  };

  const openEditStudyRoomModal = (sRoom: any) => {
    setEditingStudyRoom(sRoom);
    setStudyRoomForm({
      name: sRoom.name,
      capacity: sRoom.capacity,
      equipment: sRoom.equipment || '',
      description: sRoom.description || '',
      imageUrl: sRoom.imageUrl || ''
    });
    setErrorMsg(null);
    setShowStudyRoomModal(true);
  };

  const handleSaveStudyRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      if (editingStudyRoom) {
        await api.put(`/study-rooms/admin/${editingStudyRoom.id}`, studyRoomForm);
        setSuccessMsg(`"${studyRoomForm.name}" grup odası güncellendi.`);
      } else {
        await api.post('/study-rooms/admin/add', studyRoomForm);
        setSuccessMsg(`🎉 "${studyRoomForm.name}" yeni grup odası başarıyla eklendi ve yayınlandı.`);
      }
      setShowStudyRoomModal(false);
      setEditingStudyRoom(null);
      fetchStudyRoomsData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Grup odası kaydedilirken hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStudyRoom = async (roomId: string, roomName: string) => {
    if (!confirm(`"${roomName}" grup odasını silmek istediğinize emin misiniz?`)) return;
    try {
      await api.delete(`/study-rooms/admin/${roomId}`);
      setSuccessMsg(`"${roomName}" grup odası silindi.`);
      fetchStudyRoomsData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Grup odası silinirken hata oluştu.');
    }
  };

  const handleCreateDesk = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.post('/desks/admin/add', addForm);
      if (res.data?.status === 'success') {
        setSuccessMsg(`🎉 "${addForm.deskNumber}" masası başarıyla oluşturuldu ve haritaya eklendi.`);
        setShowAddModal(false);
        setAddForm({
          roomId: rooms[0]?.id || '',
          deskNumber: '',
          xPosition: 1,
          yPosition: 1,
          hasPowerOutlet: true
        });
        fetchRooms();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Masa eklenirken bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDesk = async (deskId: string, deskNum: string) => {
    if (!confirm(`"${deskNum}" numaralı masayı silmek istediğinize emin misiniz?`)) return;

    setDeletingId(deskId);
    try {
      await api.delete(`/desks/admin/${deskId}`);
      setSuccessMsg(`"${deskNum}" masası silindi.`);
      fetchRooms();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Masa silinirken hata oluştu.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleTogglePower = async (desk: Desk) => {
    try {
      await api.put(`/desks/admin/${desk.id}`, {
        hasPowerOutlet: !desk.hasPowerOutlet
      });
      fetchRooms();
    } catch (err: any) {
      alert('Priz durumu güncellenemedi.');
    }
  };

  // Flatten all desks for global list
  const allDesks: Desk[] = rooms.flatMap((r) =>
    r.desks.map((d) => ({ ...d, room: { name: r.name } }))
  );

  const filteredDesks = allDesks.filter((d) => {
    const matchesRoom = selectedRoomFilter === 'ALL' || d.roomId === selectedRoomFilter;
    const matchesSearch =
      d.deskNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.room?.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRoom && matchesSearch;
  });

  const totalDesksCount = allDesks.length;
  const powerOutletCount = allDesks.filter((d) => d.hasPowerOutlet).length;

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-500 text-xs font-semibold">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" /> Masa verileri yükleniyor...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16 pt-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* TOP BACK BAR & TITLE */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold flex items-center gap-1 transition-all"
          >
            <ChevronLeft className="w-4 h-4" /> Yönetici Paneline Dön
          </button>

          {adminTab === 'desks' ? (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-sm flex items-center gap-2 transition-all"
            >
              <PlusCircle className="w-4 h-4" /> Yeni Masa Ekle
            </button>
          ) : (
            <button
              onClick={openCreateStudyRoomModal}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-sm flex items-center gap-2 transition-all"
            >
              <PlusCircle className="w-4 h-4" /> Yeni Grup Odası Ekle
            </button>
          )}
        </div>

        {/* HERO STATS BAR - KURUMSAL AÇIK TEMA */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 text-slate-900 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold uppercase tracking-wider">
              <Building className="w-3.5 h-3.5 text-blue-600" /> Kat & Salon Masa Yönetim Paneli
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Çalışma Masası Kapasite & Yerleşim Yönetimi
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm">
              Kütüphane salonlarındaki masa yerleşimlerini, 220V priz donanımlarını ve grid konumlarını canlı yönetin.
            </p>
          </div>

          {/* QUICK STATS */}
          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="text-center px-3 border-r border-slate-200">
              <span className="block text-xl font-extrabold text-slate-900">{rooms.length}</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase">Salon/Kat</span>
            </div>
            <div className="text-center px-3 border-r border-slate-200">
              <span className="block text-xl font-extrabold text-emerald-700">{totalDesksCount}</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase">Toplam Masa</span>
            </div>
            <div className="text-center px-3">
              <span className="block text-xl font-extrabold text-amber-700">{powerOutletCount}</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase">Prizli Masa</span>
            </div>
          </div>
        </div>

        {/* NAV TABS */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
          <button
            onClick={() => setAdminTab('desks')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
              adminTab === 'desks'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Building className="w-4 h-4 text-blue-400" /> Bireysel Masa Yönetimi (90 Masa)
          </button>
          
          <button
            onClick={() => setAdminTab('study-rooms')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
              adminTab === 'study-rooms'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Building className="w-4 h-4 text-amber-400" /> Grup Çalışma Odaları & Aktif Rezervasyonlar
          </button>
        </div>

        {/* NOTIFICATIONS */}
        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)}>
              <X className="w-4 h-4 text-emerald-600" />
            </button>
          </div>
        )}

        {/* TAB 1: BİREYSEL MASA YÖNETİMİ */}
        {adminTab === 'desks' && (
          <div className="space-y-6">
            {/* ROOM BREAKDOWN CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {rooms.map((room) => (
                <div key={room.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">{room.name}</h3>
                      <span className="text-[10px] text-slate-500 block font-medium">{room.description}</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-xs font-extrabold">
                      {room.desks.length} Masa
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <span className="font-medium">Prizli Masa Sayısı:</span>
                    <span className="font-bold text-amber-600">
                      {room.desks.filter((d) => d.hasPowerOutlet).length} Adet 🔌
                    </span>
                  </div>
                </div>
              ))}
            </div>

        {/* TABLE FILTER & CONTROL BAR */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Masa no veya salon ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="flex items-center gap-1 text-xs">
                <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                <select
                  value={selectedRoomFilter}
                  onChange={(e) => setSelectedRoomFilter(e.target.value)}
                  className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-900"
                >
                  <option value="ALL">Tüm Salonlar ({totalDesksCount})</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.desks.length})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-xs font-bold text-slate-500">
              Gösterilen Masa: {filteredDesks.length} / {totalDesksCount}
            </div>
          </div>

          {/* DESKS TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Masa Numarası</th>
                  <th className="px-4 py-3">Bulunduğu Salon / Kat</th>
                  <th className="px-4 py-3">Priz Donanımı</th>
                  <th className="px-4 py-3">Grid Koordinat (X, Y)</th>
                  <th className="px-4 py-3 text-right">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredDesks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                      Aradığınız kriterlere uygun masa bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredDesks.map((desk) => (
                    <tr key={desk.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-extrabold text-blue-700 font-mono text-sm">
                        {desk.deskNumber}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {desk.room?.name}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleTogglePower(desk)}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all flex items-center gap-1 ${
                            desk.hasPowerOutlet
                              ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                              : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                          }`}
                          title="Priz durumunu değiştirmek için tıklayın"
                        >
                          {desk.hasPowerOutlet ? (
                            <>
                              <Zap className="w-3 h-3 fill-amber-500 text-amber-600" /> 🔌 220V Priz Var
                            </>
                          ) : (
                            <>
                              <ZapOff className="w-3 h-3 text-slate-400" /> Priz Yok
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-600">
                        X: {desk.xPosition} | Y: {desk.yPosition}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          disabled={deletingId === desk.id}
                          onClick={() => handleDeleteDesk(desk.id, desk.deskNumber)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all"
                          title="Masayı Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}

    {/* TAB 2: GRUP ÇALIŞMA ODALARI & AKTİF REZERVASYONLAR */}
    {adminTab === 'study-rooms' && (
      <div className="space-y-6">
        {/* ROOM CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(studyRoomsList.length > 0
            ? studyRoomsList
            : [
                {
                  id: 'room-1',
                  name: 'Oda 1 - Proje Çalışma Salonu (6 Kişilik)',
                  capacity: 6,
                  equipment: 'Akıllı Tahta, Projeksiyon, 6 Adet Priz, Wi-Fi',
                  description: 'Proje takımları ve grup sunum çalışmaları için tam donanımlı ses yalıtımlı çalışma odası.'
                },
                {
                  id: 'room-2',
                  name: 'Oda 2 - Sessiz Grup Çalışma (4 Kişilik)',
                  capacity: 4,
                  equipment: 'Yazı Tahtası, 4 Adet Priz, Wi-Fi',
                  description: 'Odaklanmış küçük grup tartışmaları ve akademik makale analizleri için ideal sessiz alan.'
                },
                {
                  id: 'room-3',
                  name: 'Oda 3 - Akıllı Tahtalı Sunum Odası (8 Kişilik)',
                  capacity: 8,
                  equipment: 'Çift Monitör, Akıllı Ekran, 8 Priz, Wi-Fi',
                  description: 'Yazılım geliştirme, robotik projelendirme ve büyük ölçekli takım çalışmaları odası.'
                }
              ]
          ).map((sRoom: any) => (
            <div key={sRoom.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">{sRoom.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{sRoom.description}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-extrabold whitespace-nowrap">
                    👥 {sRoom.capacity} Kişilik
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-100 text-xs">
                  <span className="font-bold text-slate-400 uppercase text-[10px]">Donanım:</span>
                  <p className="font-medium text-slate-700 mt-0.5">{sRoom.equipment}</p>
                </div>
              </div>

              {/* CARD ACTIONS */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => openEditStudyRoomModal(sRoom)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
                >
                  ✏️ Düzenle
                </button>
                <button
                  onClick={() => handleDeleteStudyRoom(sRoom.id, sRoom.name)}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-all"
                >
                  🗑️ Sil
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ACTIVE STUDY ROOM RESERVATIONS TABLE */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">🏢 Aktif Grup Oda Rezervasyonları</h3>
              <p className="text-xs text-slate-500">Öğrencilerin yaptığı onaylı veya devam eden grup randevuları</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold">
              {studyReservationsList.length} Toplam Randevu
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Öğrenci / Sorumlu</th>
                  <th className="px-4 py-3">Çalışma Odası</th>
                  <th className="px-4 py-3">Rezervasyon Tarihi</th>
                  <th className="px-4 py-3">Saat Aralığı</th>
                  <th className="px-4 py-3">Grup Üyeleri</th>
                  <th className="px-4 py-3">Çalışma Amacı</th>
                  <th className="px-4 py-3 text-right">Aksiyon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {studyReservationsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                      Henüz aktif bir grup çalışma odası rezervasyonu bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  studyReservationsList.map((resItem: any) => (
                    <tr key={resItem.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {resItem.user?.fullName || resItem.user?.email || 'Öğrenci'}
                      </td>
                      <td className="px-4 py-3 font-extrabold text-amber-700">
                        {resItem.roomName || 'Grup Oda'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        {resItem.reservationDate ? new Date(resItem.reservationDate).toLocaleDateString('tr-TR') : '-'}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-blue-700">
                        {resItem.startTime} - {resItem.endTime} ({resItem.durationHours} Saat)
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={resItem.groupEmails || 'Belirtilmedi'}>
                        {resItem.groupEmails || 'Sadece Sorumlu'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {resItem.purpose || 'Genel Proje'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleCancelStudyReservation(resItem.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] transition-all"
                        >
                          İptal Et
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}

  </div>

      {/* ADD DESK MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md p-6 rounded-3xl border border-slate-200 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-900"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-slate-900">➕ Yeni Masa Ekle</h3>
              <p className="text-xs text-slate-500">Kütüphaneye yeni bir masa tanımı ve harita pozisyonu ekleyin.</p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateDesk} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Bulunduğu Salon / Kat</label>
                <select
                  required
                  value={addForm.roomId}
                  onChange={(e) => setAddForm({ ...addForm, roomId: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-semibold focus:outline-none focus:border-slate-900"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Masa Numarası / Kodu</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Z-31, K1-31, K2-31"
                  value={addForm.deskNumber}
                  onChange={(e) => setAddForm({ ...addForm, deskNumber: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">X Pozisyonu (Sütun)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    required
                    value={addForm.xPosition}
                    onChange={(e) => setAddForm({ ...addForm, xPosition: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-semibold focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Y Pozisyonu (Satır)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    required
                    value={addForm.yPosition}
                    onChange={(e) => setAddForm({ ...addForm, yPosition: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-semibold focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="font-bold text-slate-800">🔌 220V Priz Donanımı Var</span>
                </div>
                <input
                  type="checkbox"
                  checked={addForm.hasPowerOutlet}
                  onChange={(e) => setAddForm({ ...addForm, hasPowerOutlet: e.target.checked })}
                  className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting ? 'Kaydediliyor...' : 'Masayı Kaydet ve Yayınla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT STUDY ROOM MODAL */}
      {showStudyRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg p-6 rounded-3xl border border-slate-200 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowStudyRoomModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-900"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-slate-900">
                {editingStudyRoom ? '✏️ Grup Odasını Düzenle' : '➕ Yeni Grup Çalışma Odası Ekle'}
              </h3>
              <p className="text-xs text-slate-500">
                Öğrencilerin grup randevusu alabileceği ses yalıtımlı akıllı çalışma alanı tanımı oluşturun.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveStudyRoom} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Grup Oda Adı</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Oda D - Yapay Zeka Laboratuvarı (6 Kişilik)"
                  value={studyRoomForm.name}
                  onChange={(e) => setStudyRoomForm({ ...studyRoomForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-bold focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Öğrenci Kapasitesi (Kişi)</label>
                <input
                  type="number"
                  min={2}
                  max={20}
                  required
                  value={studyRoomForm.capacity}
                  onChange={(e) => setStudyRoomForm({ ...studyRoomForm, capacity: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-semibold focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Donanım & Ekipman Özellikleri</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Akıllı Tahta, Projeksiyon, 6 Adet Priz, Wi-Fi"
                  value={studyRoomForm.equipment}
                  onChange={(e) => setStudyRoomForm({ ...studyRoomForm, equipment: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-semibold focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Açıklama / Detay</label>
                <textarea
                  rows={2}
                  placeholder="Odanın kullanım amacı ve özellikleri..."
                  value={studyRoomForm.description}
                  onChange={(e) => setStudyRoomForm({ ...studyRoomForm, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-medium focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Oda Görsel URL (Unsplash veya Görsel)</label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  value={studyRoomForm.imageUrl}
                  onChange={(e) => setStudyRoomForm({ ...studyRoomForm, imageUrl: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono text-[11px] focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowStudyRoomModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting ? 'Kaydediliyor...' : editingStudyRoom ? 'Grup Odasını Güncelle' : 'Grup Odasını Kaydet ve Yayınla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
