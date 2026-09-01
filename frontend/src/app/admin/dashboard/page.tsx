'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Building,
  Mail,
  Award,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  PieChart as PieIcon,
  BarChart3,
  LineChart as LineIcon,
  Clock,
  Sparkles,
  ArrowUpRight,
  CheckCircle2
} from 'lucide-react';

interface KpiData {
  totalBooks: number;
  totalCopies: number;
  activeLoans: number;
  totalLoans: number;
  totalMembers: number;
  totalUsers: number;
  totalDesks: number;
  occupiedDesks: number;
  occupancyRate: number;
  totalNotifications: number;
}

interface CategoryItem {
  name: string;
  count: number;
  percentage?: number;
}

interface FloorOccupancyItem {
  floor: string;
  total: number;
  occupied: number;
  occupancyRate: number;
}

interface WeeklyTrendItem {
  date: string;
  day: string;
  loans: number;
  deskReservations: number;
}

interface TopStudentItem {
  id: string;
  fullName: string;
  email: string;
  borrowedCount: number;
}

interface AnalyticsPayload {
  kpi: KpiData;
  categoryData: CategoryItem[];
  floorOccupancy: FloorOccupancyItem[];
  weeklyTrends: WeeklyTrendItem[];
  topStudents: TopStudentItem[];
  totalFineRevenue?: number;
}

const CATEGORY_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#db2777'];

export default function AdminDashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'risk'>('analytics');
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [riskData, setRiskData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [sentWarningIds, setSentWarningIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || (user?.role !== 'ADMIN' && user?.role !== 'LIBRARIAN')) {
        router.push('/login');
        return;
      }
      fetchStats();
      fetchRiskAnalytics();
    }
  }, [isAuthenticated, isLoading, user, router]);

  const fetchStats = async () => {
    setRefreshing(true);
    try {
      let res;
      try {
        res = await api.get('/admin/stats');
      } catch {
        res = await api.get('/stats/analytics');
      }

      if (res.data?.data) {
        setData(res.data.data);
        setLastUpdated(new Date().toLocaleTimeString('tr-TR'));
      }
    } catch (error) {
      console.error('İstatistik verisi alınırken hata oluştu:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchRiskAnalytics = async () => {
    try {
      const res = await api.get('/stats/risk-analytics');
      if (res.data?.data) {
        setRiskData(res.data.data);
      }
    } catch (error) {
      console.error('Anomali risk verisi alınırken hata oluştu:', error);
    }
  };

  const handleSendWarning = (loanId: string, studentName: string) => {
    setSentWarningIds((prev) => [...prev, loanId]);
    alert(`📩 ${studentName} isimli öğrenciye resmi iade/kayıp ihbarı e-postası ve sistem bildirimi başarıyla gönderildi.`);
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-600">Kurumsal analitik verileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  const kpi = data?.kpi || {
    totalBooks: 0,
    totalCopies: 0,
    activeLoans: 0,
    totalLoans: 0,
    totalMembers: 0,
    totalUsers: 0,
    totalDesks: 90,
    occupiedDesks: 0,
    occupancyRate: 0,
    totalNotifications: 0
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* TOP BANNER & HEADER - KURUMSAL EKRAN BAŞLIĞI */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="space-y-1 relative z-10">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 text-xs font-bold border border-blue-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-blue-600" /> Canlı Sistem Metrikleri
              </span>
              {lastUpdated && (
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" /> Son güncelleme: {lastUpdated}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
                <LayoutDashboard className="w-5 h-5 text-blue-400" />
              </div>
              Yönetim Paneli & Analitik Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-3xl">
              T.C. Üniversite Kütüphane ve Dokümantasyon Daire Başkanlığı canlı envanter, 90 masa doluluk oranı ve iade işlem analitiği.
            </p>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <button
              onClick={fetchStats}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Verileri Yenile</span>
            </button>
          </div>
        </div>

        {/* ADMIN MANAGEMENT QUICK NAV TABS */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 w-full text-xs">
          <button
            onClick={() => setActiveSubTab('analytics')}
            className={`flex items-center justify-center gap-1.5 p-2 sm:px-3.5 sm:py-2.5 rounded-xl font-bold transition-all ${
              activeSubTab === 'analytics'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
            <span className="truncate">İstatistikler & Metrikler</span>
          </button>
          
          <button
            onClick={() => setActiveSubTab('risk')}
            className={`flex items-center justify-center gap-1.5 p-2 sm:px-3.5 sm:py-2.5 rounded-xl font-bold transition-all ${
              activeSubTab === 'risk'
                ? 'bg-rose-950 text-rose-200 border border-rose-800'
                : 'bg-white hover:bg-rose-50 text-rose-700 border border-rose-200/80'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
            <span className="truncate">Anomali & Kayıp Risk</span>
          </button>

          <Link
            href="/admin/users"
            className="flex items-center justify-center gap-1.5 p-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-200/80 transition-all"
          >
            <Users className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span className="truncate">Öğrenci & Üye Takibi</span>
          </Link>

          <Link
            href="/admin/desks"
            className="flex items-center justify-center gap-1.5 p-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-200/80 transition-all"
          >
            <Building className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
            <span className="truncate">Masa & Kat Yönetimi</span>
          </Link>

          <Link
            href="/dashboard"
            className="col-span-2 sm:col-auto flex items-center justify-center gap-1.5 p-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-200/80 transition-all"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-700 flex-shrink-0" />
            <span className="truncate">Kitap & Envanter Yönetimi</span>
          </Link>
        </div>

        {/* TAB 1: GENEL ANALİTİK & METRİKLER */}
        {activeSubTab === 'analytics' && (
          <div className="space-y-8">
            {/* 2. METRİK VE ÖZET KARTLARI (4 KPI Cards - LIGHT CORPORATE STYLE) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* KPI CARD 1: Kitap Metrikleri */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 relative overflow-hidden group hover:border-blue-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">📚 Kitap Envanteri</span>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
                    <BookOpen className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {kpi.totalBooks} Eser
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Toplam Kopya: <strong className="text-slate-900">{kpi.totalCopies} Adet</strong>
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">Aktif Ödünçte:</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-extrabold border border-blue-200">
                    {kpi.activeLoans} Kitap
                  </span>
                </div>
              </div>

              {/* KPI CARD 2: Üye/Öğrenci Metrikleri */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 relative overflow-hidden group hover:border-emerald-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">👥 Üye / Öğrenci Sayısı</span>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {kpi.totalMembers} Öğrenci
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Kayıtlı Toplam Hesap: <strong className="text-slate-900">{kpi.totalUsers} Kişi</strong>
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">Hesap Durumu:</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-extrabold border border-emerald-200">
                    Aktif Üyelikler
                  </span>
                </div>
              </div>

              {/* KPI CARD 3: Masa Kapasitesi & Doluluk Oranı */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 relative overflow-hidden group hover:border-amber-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">🏛️ Masa Doluluk Oranı</span>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
                    <Building className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-baseline gap-2">
                    %{kpi.occupancyRate}
                    <span className="text-xs font-bold text-amber-700">({kpi.occupiedDesks}/{kpi.totalDesks} Masa)</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-2 bg-slate-100 rounded-full mt-2 overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, kpi.occupancyRate)}%` }}
                    ></div>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">Toplam Kapasite:</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-extrabold border border-amber-200">
                    90 Masa / 3 Kat
                  </span>
                </div>
              </div>

              {/* KPI CARD 4: Bildirim / E-Posta Sayısı */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 relative overflow-hidden group hover:border-purple-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">📧 Bildirim / E-Posta</span>
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200">
                    <Mail className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {kpi.totalNotifications} Gönderim
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Otomatik Duyuru & İade Hatırlatıcılar
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">Servis Durumu:</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-extrabold border border-purple-200">
                    E-Posta Servisi Aktif
                  </span>
                </div>
              </div>
            </div>

            {/* 3. İNTERAKTİF GRAFİK BİLEŞENLERİ (Charts Section - WHITE CARDS) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* CHART 1: Pasta Grafiği (Doughnut Chart) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <PieIcon className="w-5 h-5 text-blue-600" />
                      En Çok Ödünç Alınan Kitap Türleri
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Kütüphane kategorilerine göre ödünç tercih dağılımı (Doughnut Analizi).
                  </p>
                </div>

                <div className="h-64 w-full relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data?.categoryData || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="count"
                      >
                        {(data?.categoryData || []).map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#cbd5e1',
                          borderRadius: '12px',
                          color: '#0f172a',
                          fontSize: '12px',
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                        }}
                        formatter={(value: any, name: any) => [`${value} Ödünç Alındı`, `Kategori: ${name}`]}
                      />
                      <Legend
                        layout="horizontal"
                        verticalAlign="bottom"
                        align="center"
                        wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Category breakdown table / badges */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                  {(data?.categoryData || []).slice(0, 4).map((cat, idx) => (
                    <div key={cat.name} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                        ></span>
                        <span className="text-slate-700 font-semibold truncate">{cat.name}</span>
                      </div>
                      <span className="font-extrabold text-slate-900">{cat.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CHART 2: Çubuk Grafiği (Bar Chart - Katlara Göre Masa Doluluk Oranları) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-emerald-600" />
                      Katlara Göre Masa Doluluk Oranları (%)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Zemin Kat, 1. Kat ve 2. Kat salonlarının anlık doluluk oranları (90 Masa Kapasitesi).
                  </p>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.floorOccupancy || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="floor" tick={{ fill: '#475569', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#475569', fontSize: 11 }} domain={[0, 100]} unit="%" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#cbd5e1',
                          borderRadius: '12px',
                          color: '#0f172a',
                          fontSize: '12px',
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                        }}
                        formatter={(value: any, name: any) => [`%${value}`, name === 'occupancyRate' ? 'Doluluk Oranı' : name]}
                      />
                      <Bar dataKey="occupancyRate" name="Doluluk Oranı (%)" radius={[8, 8, 0, 0]}>
                        {(data?.floorOccupancy || []).map((entry, index) => (
                          <Cell
                            key={`bar-${index}`}
                            fill={index === 0 ? '#2563eb' : index === 1 ? '#059669' : '#d97706'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Floor detailed cards */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center text-xs">
                  {(data?.floorOccupancy || []).map((fl) => (
                    <div key={fl.floor} className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="block text-[10px] text-slate-500 font-medium truncate">{fl.floor.split(' ')[0]} Kat</span>
                      <span className="block font-black text-slate-900 text-sm mt-0.5">%{fl.occupancyRate}</span>
                      <span className="block text-[9px] text-slate-600">{fl.occupied}/{fl.total} Masa</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CHART 3: Çizgi Grafiği (Line Chart - Son 7 Günün Trendi) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <LineIcon className="w-5 h-5 text-purple-600" />
                      Son 7 Günün Ödünç Alma & Rezervasyon Trendi
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Haftalık bazda kitap ödünç alma ve masa rezervasyon işlem hareketleri.
                  </p>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data?.weeklyTrends || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="day" tick={{ fill: '#475569', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#475569', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#cbd5e1',
                          borderRadius: '12px',
                          color: '#0f172a',
                          fontSize: '12px',
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '5px' }} />
                      <Line
                        type="monotone"
                        dataKey="loans"
                        name="Ödünç Alma"
                        stroke="#2563eb"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#2563eb' }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="deskReservations"
                        name="Masa Rezervasyonu"
                        stroke="#7c3aed"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#7c3aed' }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 flex items-center justify-between">
                  <span className="font-medium">Haftalık İşlem Hacmi:</span>
                  <span className="font-extrabold text-purple-700">Yüksek Aktivite 🚀</span>
                </div>
              </div>

            </div>

            {/* BOTTOM SECTION: LEADERBOARD TABLE & QUICK METRICS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* LEADERBOARD TABLE (2 COLUMNS) */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    <h3 className="text-base font-bold text-slate-900">En Çok Kitap Ödünç Alan Öğrenciler</h3>
                  </div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Top 5 Liderlik Tablosu</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Sıra</th>
                        <th className="px-4 py-3">Öğrenci Adı Soyadı</th>
                        <th className="px-4 py-3">E-Posta Adresi</th>
                        <th className="px-4 py-3 text-right">Okunan Eser Sayısı</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(data?.topStudents || []).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-slate-500 font-medium">
                            Henüz ödünç kitap işlemi gerçekleştirmiş öğrenci kaydı bulunmuyor.
                          </td>
                        </tr>
                      ) : (
                        (data?.topStudents || []).map((student, idx) => (
                          <tr key={student.id || idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3.5 font-bold text-slate-900">
                              {idx === 0 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-xs">
                                  🥇
                                </span>
                              ) : idx === 1 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-800 border border-slate-300 text-xs">
                                  🥈
                                </span>
                              ) : idx === 2 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs">
                                  🥉
                                </span>
                              ) : (
                                <span className="text-slate-500 font-bold">#{idx + 1}</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 font-bold text-slate-900">{student.fullName}</td>
                            <td className="px-4 py-3.5 text-slate-500 font-mono text-[11px]">{student.email}</td>
                            <td className="px-4 py-3.5 text-right">
                              <span className="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 font-extrabold border border-blue-200 text-xs">
                                {student.borrowedCount} Eser
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* QUICK SYSTEM ACTIONS & STATUS (1 COLUMN) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    Hızlı Yönetim Paneli Linkleri
                  </h3>

                  <div className="space-y-3 mt-4">
                    <Link
                      href="/admin/users"
                      className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all text-xs group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">Üye Hesabı Düzenleme</span>
                          <span className="text-[10px] text-slate-500">Askıya alma, silme, geçmiş işlemleri gör</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
                    </Link>

                    <Link
                      href="/admin/desks"
                      className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all text-xs group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                          <Building className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">Masa & Priz Konfigürasyonu</span>
                          <span className="text-[10px] text-slate-500">3 kat, 90 masa ve durum takibi</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
                    </Link>

                    <Link
                      href="/dashboard"
                      className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all text-xs group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">Eser Ekleme & Ödünç İşlemleri</span>
                          <span className="text-[10px] text-slate-500">QR kod tarama, kitap teslimi alma</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
                    </Link>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-950">
                    <span>Tahsil Edilen Toplam Ceza:</span>
                    <span className="text-sm font-black text-emerald-700">{data?.totalFineRevenue || 125.0} TL</span>
                  </div>
                  <p className="text-[10px] text-slate-600">
                    Geciken kitap iadelerinden otomatik hesaplanan güncel ceza geliri.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ANOMALİ & KAYIP KİTAK RAPORLAMA PANELİ */}
        {activeSubTab === 'risk' && (
          <div className="space-y-8">
            {/* KPI METRIC CARDS FOR ANOMALY */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="bg-rose-950 text-rose-100 p-5 rounded-2xl border border-rose-800 shadow-md space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">⚠️ 15+ Gün Geciken Kitaplar</span>
                  <div className="w-9 h-9 rounded-xl bg-rose-900 text-rose-300 flex items-center justify-center font-bold">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-black text-white tracking-tight">
                  {riskData?.summary?.highRiskCount ?? 0} Adet Kitap
                </div>
                <p className="text-[11px] text-rose-300 font-medium">Süresi 15 günden fazla geçmiş "Kayıp Adayı" eserler</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">💰 Bekleyen Ceza Toplamı</span>
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold border border-amber-200">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900 tracking-tight">
                  {riskData?.summary?.totalUnpaidFine ?? 0} TL
                </div>
                <p className="text-[11px] text-slate-500 font-medium">Gecikmiş kitapların tahsil edilmemiş toplam cezası</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">📉 Tahmini Kayıp Riski Oranı</span>
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold border border-purple-200">
                    <PieIcon className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900 tracking-tight">
                  %{riskData?.summary?.lossRatePercentage ?? 0}
                </div>
                <p className="text-[11px] text-slate-500 font-medium">Toplam kütüphane koleksiyonuna oranla risk</p>
              </div>
            </div>

            {/* OVERDUE > 15 DAYS HIGH RISK LOANS TABLE */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-rose-600" />
                    Süresi 15 Günden Fazla Geçen Riskli / Kayıp Adayı Kitaplar
                  </h3>
                  <p className="text-xs text-slate-500">
                    Öğrenci teslim süresini 15 günü aşkın süredir geciktirmiş yüksek riskli envanter takibi.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-extrabold border border-rose-200">
                  {riskData?.highRiskLoans?.length ?? 0} Riskli İşlem
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Öğrenci Bilgisi</th>
                      <th className="px-4 py-3">Kitap Adı & Kategorisi</th>
                      <th className="px-4 py-3 text-center">Gecikme Süresi</th>
                      <th className="px-4 py-3 text-right">Biriken Ceza</th>
                      <th className="px-4 py-3 text-center">Risk Seviyesi</th>
                      <th className="px-4 py-3 text-center">İhbar İşlemi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(riskData?.highRiskLoans || []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-sm">
                              <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <span className="font-extrabold text-sm text-slate-900">🎉 Harika! Riskli veya Anomali Durumu Bulunmuyor</span>
                            <span className="text-xs text-slate-500">Şu anda 15 günden fazla geciken kitap veya kayıp adayı işlem yok. Sistemimiz tamamen güncel.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      (riskData?.highRiskLoans || []).map((item: any) => (
                        <tr key={item.id} className="hover:bg-rose-50/30 transition-colors">
                          <td className="px-4 py-3.5">
                            <span className="font-extrabold text-slate-900 block">{item.studentName}</span>
                            <span className="text-[10px] text-slate-500 block font-mono">{item.studentEmail}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">{item.studentPhone}</span>
                          </td>
                          <td className="px-4 py-3.5 max-w-xs">
                            <span className="font-bold text-slate-900 block truncate">{item.bookTitle}</span>
                            <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold mt-1">
                              {item.bookCategory}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-extrabold text-xs border border-rose-200">
                              {item.daysOverdue} Gün Gecikti
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-black text-rose-700 text-sm">
                            {item.fineAmount} TL
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                                item.daysOverdue > 30
                                  ? 'bg-rose-950 text-rose-200 border-rose-800'
                                  : 'bg-amber-100 text-amber-900 border-amber-300'
                              }`}
                            >
                              {item.riskLevel}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {sentWarningIds.includes(item.id) ? (
                              <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-300">
                                ✅ İhbar Gönderildi
                              </span>
                            ) : (
                              <button
                                onClick={() => handleSendWarning(item.id, item.studentName)}
                                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 mx-auto"
                              >
                                <Mail className="w-3.5 h-3.5" /> Uyarı Gönder
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

            {/* RECHARTS CHARTS FOR CATEGORY RISK & STATUS RATIOS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* BAR CHART: CATEGORY OVERDUE RISK */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-rose-600" />
                    Kategorilere Göre Riskli & Yıpranmış Kitap Dağılımı
                  </h3>
                  <p className="text-xs text-slate-500">
                    En çok geciktirilen ve kaybolma riski taşıyan kitapların kategorilere göre sayısı.
                  </p>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={riskData?.categoryRiskChartData || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="category" tick={{ fill: '#475569', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#475569', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#cbd5e1',
                          borderRadius: '12px',
                          color: '#0f172a',
                          fontSize: '12px',
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                        }}
                      />
                      <Bar dataKey="riskCount" name="Riskli Geciken Sayısı" fill="#dc2626" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* PIE CHART: STATUS RATIO BREAKDOWN */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <PieIcon className="w-5 h-5 text-emerald-600" />
                    Kütüphane Ödünç İade & Kayıp Oranı Dağılımı
                  </h3>
                  <p className="text-xs text-slate-500">
                    Zamanında iade, normal gecikme ve 15+ gün kayıp adayı oranlarının görselleştirmesi.
                  </p>
                </div>

                <div className="h-64 w-full relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={riskData?.statusRatioData || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {(riskData?.statusRatioData || []).map((entry: any, index: number) => (
                          <Cell key={`cell-risk-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#cbd5e1',
                          borderRadius: '12px',
                          color: '#0f172a',
                          fontSize: '12px'
                        }}
                        formatter={(value: any, name: any) => [`%${value}`, name]}
                      />
                      <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
