'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import {
  Users,
  Search,
  BookOpen,
  Building,
  UserCheck,
  UserX,
  Eye,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  ChevronLeft,
  Trash2
} from 'lucide-react';

interface UserListItem {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  activeLoanCount: number;
  activeDeskStatus: string;
}

interface UserDetailsData {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  loans: {
    id: string;
    issueDate: string;
    dueDate: string;
    status: string;
    fineAmount: number;
    book: {
      title: string;
      isbn: string;
      category: string;
    };
  }[];
  deskReservations: {
    id: string;
    reservationDate: string;
    startTime: string;
    endTime: string;
    status: string;
    desk: {
      deskNumber: string;
      room: {
        name: string;
      };
    };
  }[];
}

export default function AdminUsersPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'LOANS' | 'DESK' | 'SUSPENDED'>('ALL');

  // Modal State
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserDetailsData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [statusTogglingId, setStatusTogglingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || (user?.role !== 'ADMIN' && user?.role !== 'LIBRARIAN')) {
        router.push('/login');
        return;
      }
      fetchUsers();
    }
  }, [isAuthenticated, isLoading, user, router]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users');
      if (res.data?.data?.users) {
        setUsers(res.data.data.users);
      }
    } catch (err) {
      console.error('Kullanıcı verileri çekilemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetailModal = async (userId: string) => {
    setLoadingDetail(true);
    try {
      const res = await api.get(`/admin/users/${userId}/details`);
      if (res.data?.data?.user) {
        setSelectedUserDetail(res.data.data.user);
      }
    } catch (err) {
      console.error('Kullanıcı detayı çekilemedi:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const actionText = newStatus ? 'aktif etmek' : 'askıya almak (pasif yapmak)';
    if (!confirm(`Bu kullanıcının hesabını ${actionText} istediğinize emin misiniz?`)) return;

    setStatusTogglingId(userId);
    try {
      const res = await api.patch(`/admin/users/${userId}/status`, { isActive: newStatus });
      setSuccessMsg(res.data?.message || 'Kullanıcı durumu güncellendi.');
      fetchUsers();

      if (selectedUserDetail && selectedUserDetail.id === userId) {
        setSelectedUserDetail((prev) => (prev ? { ...prev, isActive: newStatus } : null));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Kullanıcı durumu güncellenemedi.');
    } finally {
      setStatusTogglingId(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`"${userName}" kullanıcısının hesabını veritabanından tamamen silmek istediğinize emin misiniz?`)) return;

    try {
      const res = await api.delete(`/admin/users/${userId}`);
      setSuccessMsg(res.data?.message || 'Kullanıcı hesabı veritabanından tamamen silindi.');
      fetchUsers();

      if (selectedUserDetail?.id === userId) {
        setSelectedUserDetail(null);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Kullanıcı silinirken hata oluştu.');
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'LOANS') return u.activeLoanCount > 0;
    if (filterType === 'DESK') return u.activeDeskStatus !== 'Masa Bulunmuyor';
    if (filterType === 'SUSPENDED') return !u.isActive;

    return true;
  });

  const totalMembers = users.length;
  const activeLoansCount = users.filter((u) => u.activeLoanCount > 0).length;
  const activeDeskUsersCount = users.filter((u) => u.activeDeskStatus !== 'Masa Bulunmuyor').length;

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-500 text-xs font-semibold">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" /> Canlı kayıtlı üye verileri yükleniyor...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16 pt-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* BACK BUTTON */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold flex items-center gap-1 transition-all"
          >
            <ChevronLeft className="w-4 h-4" /> Yönetici Paneline Dön
          </button>

          <button
            onClick={fetchUsers}
            className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Canlı Listeyi Yenile
          </button>
        </div>

        {/* HERO BANNER - KURUMSAL AÇIK TEMA */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 text-slate-900 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold uppercase tracking-wider">
              <Users className="w-3.5 h-3.5 text-blue-600" /> Canlı Kayıtlı Öğrenci & Üye Takip Paneli
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Gerçek Zamanlı Öğrenci & Hesap Yönetimi
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm">
              Siteden yeni üye kaydı alan gerçek kullanıcılar buradaki canlı tabloya otomatik olarak anında düşmektedir.
            </p>
          </div>

          {/* QUICK STATS */}
          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="text-center px-3 border-r border-slate-200">
              <span className="block text-xl font-extrabold text-slate-900">{totalMembers}</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase">Kayıtlı Kullanıcı</span>
            </div>
            <div className="text-center px-3 border-r border-slate-200">
              <span className="block text-xl font-extrabold text-blue-700">{activeLoansCount}</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase">Ödünç Alanlar</span>
            </div>
            <div className="text-center px-3">
              <span className="block text-xl font-extrabold text-emerald-700">{activeDeskUsersCount}</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase">Masada Oturanlar</span>
            </div>
          </div>
        </div>

        {/* NOTIFICATION */}
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

        {/* CONTROL BAR */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="İsim veya e-posta ile ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                />
              </div>

              {/* FILTER BUTTONS */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-nowrap w-full touch-pan-x text-xs">
                <button
                  onClick={() => setFilterType('ALL')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap flex-shrink-0 ${
                    filterType === 'ALL'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Tümü ({users.length})
                </button>
                <button
                  onClick={() => setFilterType('LOANS')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap flex-shrink-0 ${
                    filterType === 'LOANS'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Ödünç Kitabı Olanlar ({activeLoansCount})
                </button>
                <button
                  onClick={() => setFilterType('DESK')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap flex-shrink-0 ${
                    filterType === 'DESK'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Masada Oturanlar ({activeDeskUsersCount})
                </button>
                <button
                  onClick={() => setFilterType('SUSPENDED')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap flex-shrink-0 ${
                    filterType === 'SUSPENDED'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Hesabı Askıda Olanlar
                </button>
              </div>
            </div>

            <div className="text-xs font-bold text-slate-500">
              Gösterilen: {filteredUsers.length} / {users.length}
            </div>
          </div>

          {/* USERS TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Öğrenci / Üye Adı</th>
                  <th className="px-4 py-3">Kayıt Tarihi</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Aktif Ödünç Kitap</th>
                  <th className="px-4 py-3">Masa Rezervasyonu / Konumu</th>
                  <th className="px-4 py-3">Hesap Durumu</th>
                  <th className="px-4 py-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                      Henüz kaydolan bir kullanıcı veya filtreye uygun öğrenci bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-extrabold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                            {u.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="block">{u.fullName}</span>
                            <span className="text-[10px] text-slate-400 font-mono font-medium block">
                              {u.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-semibold text-slate-600">
                        {new Date(u.createdAt).toLocaleDateString('tr-TR')}
                      </td>

                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 text-slate-800 border border-slate-200">
                          {u.role}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {u.activeLoanCount > 0 ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-extrabold text-[10px] flex items-center gap-1 w-max">
                            <BookOpen className="w-3 h-3 text-blue-600" /> {u.activeLoanCount} Kitap Ödünçte
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-medium">
                            Ödünç Yok
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 font-medium text-slate-800">
                        {u.activeDeskStatus !== 'Masa Bulunmuyor' ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold text-[10px] flex items-center gap-1 w-max">
                            <Building className="w-3 h-3 text-emerald-600" /> {u.activeDeskStatus}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Masa Bulunmuyor</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {u.isActive ? (
                          <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-bold text-[10px] border border-emerald-300 inline-flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-emerald-600" /> AKTİF
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-900 font-bold text-[10px] border border-rose-300 inline-flex items-center gap-1">
                            <UserX className="w-3 h-3 text-rose-600" /> ASKIDA (PASİF)
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right space-x-1.5">
                        <button
                          onClick={() => handleOpenDetailModal(u.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-all inline-flex items-center gap-1"
                          title="Öğrenci Detayları"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600" /> İncele
                        </button>

                        <button
                          disabled={statusTogglingId === u.id}
                          onClick={() => handleToggleStatus(u.id, u.isActive)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 inline-flex items-center gap-1 ${
                            u.isActive
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {u.isActive ? 'Askıya Al' : 'Aktif Et'}
                        </button>

                        {u.role !== 'ADMIN' && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.fullName)}
                            className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-all inline-flex items-center justify-center"
                            title="Hesabı Veritabanından Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* STUDENT DETAILS MODAL */}
      {selectedUserDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-3xl p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xl space-y-6 relative my-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedUserDetail(null)}
              className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-900"
            >
              <X className="w-5 h-5" />
            </button>

            {/* MODAL HEADER */}
            <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 text-amber-400 font-extrabold text-xl flex items-center justify-center border-2 border-amber-400/40 flex-shrink-0">
                {selectedUserDetail.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-extrabold text-slate-900">{selectedUserDetail.fullName}</h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${
                      selectedUserDetail.isActive
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    {selectedUserDetail.isActive ? 'AKTİF HESAP' : 'ASKIYA ALINDI'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">E-Posta: {selectedUserDetail.email} | Kayıt: {new Date(selectedUserDetail.createdAt).toLocaleDateString('tr-TR')}</p>
              </div>
            </div>

            {/* LOANS HISTORY SECTION */}
            <div className="space-y-3">
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" /> Ödünç Alınan Kitaplar Geçmişi ({selectedUserDetail.loans.length})
              </h4>

              {selectedUserDetail.loans.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 text-slate-500 text-xs text-center font-medium">
                  Bu öğrenciye ait ödünç kayıt verisi bulunmamaktadır.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">Kitap Adı</th>
                        <th className="px-3 py-2">ISBN</th>
                        <th className="px-3 py-2">Alma Tarihi</th>
                        <th className="px-3 py-2">Son Teslim</th>
                        <th className="px-3 py-2">Durum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedUserDetail.loans.map((l) => (
                        <tr key={l.id}>
                          <td className="px-3 py-2 font-bold text-slate-900">{l.book.title}</td>
                          <td className="px-3 py-2 font-mono text-[10px] text-slate-500">{l.book.isbn}</td>
                          <td className="px-3 py-2">{new Date(l.issueDate).toLocaleDateString('tr-TR')}</td>
                          <td className="px-3 py-2">{new Date(l.dueDate).toLocaleDateString('tr-TR')}</td>
                          <td className="px-3 py-2">
                            <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-[10px] text-slate-700">
                              {l.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* DESK RESERVATION HISTORY SECTION */}
            <div className="space-y-3 pt-2">
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-600" /> Çalışma Masası Rezervasyon Geçmişi ({selectedUserDetail.deskReservations.length})
              </h4>

              {selectedUserDetail.deskReservations.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 text-slate-500 text-xs text-center font-medium">
                  Bu öğrenciye ait masa rezervasyon geçmişi bulunmamaktadır.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">Salon / Kat</th>
                        <th className="px-3 py-2">Masa No</th>
                        <th className="px-3 py-2">Tarih</th>
                        <th className="px-3 py-2">Saat Aralığı</th>
                        <th className="px-3 py-2">Durum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedUserDetail.deskReservations.map((r) => (
                        <tr key={r.id}>
                          <td className="px-3 py-2 font-bold text-slate-900">{r.desk.room.name}</td>
                          <td className="px-3 py-2 font-mono font-bold text-blue-700">{r.desk.deskNumber}</td>
                          <td className="px-3 py-2">{new Date(r.reservationDate).toLocaleDateString('tr-TR')}</td>
                          <td className="px-3 py-2 font-bold">{r.startTime} - {r.endTime}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                r.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* MODAL ACTIONS */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleStatus(selectedUserDetail.id, selectedUserDetail.isActive)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    selectedUserDetail.isActive
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {selectedUserDetail.isActive ? '🚫 Hesabı Askıya Al' : '✅ Hesabı Aktif Et'}
                </button>

                {selectedUserDetail.role !== 'ADMIN' && (
                  <button
                    onClick={() => handleDeleteUser(selectedUserDetail.id, selectedUserDetail.fullName)}
                    className="px-4 py-2 rounded-xl bg-rose-900 hover:bg-rose-950 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4 text-rose-300" /> Hesabı Kalıcı Sil
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedUserDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
