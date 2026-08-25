'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { QRCodeSVG } from 'qrcode.react';
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
  PlusCircle,
  Trash2,
  Clock,
  AlertTriangle,
  Users,
  Search,
  X,
  CheckCircle2,
  RotateCcw,
  BookMarked,
  Eye,
  Edit,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  QrCode,
  Trophy,
  DollarSign,
  Scan,
  Camera,
  CreditCard,
  Building,
  FileText
} from 'lucide-react';
import PdfViewerModal from '@/components/PdfViewerModal';

interface Book {
  id: string;
  title: string;
  isbn: string;
  author: string;
  publisher: string;
  category: string;
  totalCopies: number;
  availableCopies: number;
  locationShelf: string;
  coverUrl?: string | null;
  pdfUrl?: string | null;
  description?: string | null;
}

interface Loan {
  id: string;
  issueDate: string;
  dueDate: string;
  returnDate?: string | null;
  status: 'ACTIVE' | 'OVERDUE' | 'RETURNED';
  fineAmount: number;
  user: {
    id: string;
    email: string;
    fullName: string;
  };
  book: {
    id: string;
    title: string;
    isbn: string;
  };
}

interface AnalyticsData {
  kpi?: {
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
  };
  categoryData: { name: string; count: number; percentage?: number }[];
  floorOccupancy?: { floor: string; total: number; occupied: number; occupancyRate: number }[];
  weeklyTrends?: { date: string; day: string; loans: number; deskReservations: number }[];
  monthlyData?: { month: string; loans: number; returns: number }[];
  totalFineRevenue: number;
  topStudents: { id: string; fullName: string; email: string; borrowedCount: number }[];
}

const COLORS = ['#0f172a', '#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626'];

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'books' | 'loans' | 'analytics'>('books');
  const [mounted, setMounted] = useState(false);

  // Data states
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Tümü');
  const [stockFilter, setStockFilter] = useState('Tümü');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals & QR
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showQrScanModal, setShowQrScanModal] = useState(false);
  const [qrCodeInput, setQrCodeInput] = useState('');
  const [scannedLoan, setScannedLoan] = useState<Loan | null>(null);
  const [qrScanError, setQrScanError] = useState<string | null>(null);

  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [inspectBook, setInspectBook] = useState<Book | null>(null);
  const [activePdfBook, setActivePdfBook] = useState<Book | null>(null);

  // Form state
  const [bookForm, setBookForm] = useState({
    title: '',
    isbn: '',
    author: '',
    publisher: '',
    category: 'Yazılım',
    totalCopies: 3,
    locationShelf: 'Raf A-01',
    coverUrl: '',
    description: ''
  });

  const [issueForm, setIssueForm] = useState({
    userId: '',
    bookId: '',
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    if (!isLoading) {
      if (!isAuthenticated || (user?.role !== 'ADMIN' && user?.role !== 'LIBRARIAN')) {
        router.push('/login');
        return;
      }
      fetchDashboardData();
    }
  }, [isAuthenticated, isLoading, user, router]);

  // LIVE WEBCAM SCANNER INTEGRATION (html5-qrcode)
  useEffect(() => {
    if (!showQrScanModal) return;

    let scanner: any = null;
    const timeout = setTimeout(() => {
      try {
        const { Html5QrcodeScanner } = require('html5-qrcode');
        scanner = new Html5QrcodeScanner(
          'qr-reader',
          { fps: 10, qrbox: { width: 220, height: 220 } },
          /* verbose= */ false
        );

        scanner.render(
          (decodedText: string) => {
            handleQrLookup(decodedText);
          },
          () => {
            // silent frame error handling
          }
        );
      } catch (err) {
        console.error('Kamera tarayıcı yüklenemedi:', err);
      }
    }, 200);

    return () => {
      clearTimeout(timeout);
      if (scanner) {
        scanner.clear().catch((e: any) => console.log('Scanner clear error:', e));
      }
    };
  }, [showQrScanModal]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [booksRes, loansRes, analyticsRes] = await Promise.allSettled([
        api.get('/books'),
        api.get('/loans/all'),
        api.get('/stats/analytics')
      ]);

      if (booksRes.status === 'fulfilled' && booksRes.value.data?.data?.books) {
        setBooks(booksRes.value.data.data.books);
      }
      if (loansRes.status === 'fulfilled' && loansRes.value.data?.data?.loans) {
        setLoans(loansRes.value.data.data.loans);
      }
      if (analyticsRes.status === 'fulfilled' && analyticsRes.value.data?.data) {
        setAnalytics(analyticsRes.value.data.data);
      }
    } catch (err) {
      console.error('API veri çekme hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  // QR Scan Lookup
  const handleQrLookup = (code: string) => {
    setQrScanError(null);
    setScannedLoan(null);

    const cleanCode = code.trim();
    const found = loans.find(
      (l) => l.id === cleanCode || l.book.isbn === cleanCode || l.book.title.toLowerCase().includes(cleanCode.toLowerCase())
    );

    if (found) {
      setScannedLoan(found);
    } else {
      setQrScanError(`"${cleanCode}" kodu ile eşleşen aktif ödünç kaydı bulunamadı.`);
    }
  };

  // Save Book submit
  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      if (editingBook) {
        await api.put(`/books/${editingBook.id}`, bookForm);
        setSuccessMsg('Kitap bilgileri başarıyla güncellendi.');
      } else {
        await api.post('/books', bookForm);
        setSuccessMsg('Yeni kitap başarıyla kütüphaneye eklendi.');
      }
      setShowAddBookModal(false);
      setEditingBook(null);
      resetBookForm();
      await fetchDashboardData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Kitap kaydedilirken hata oluştu.');
    }
  };

  const resetBookForm = () => {
    setBookForm({
      title: '',
      isbn: '',
      author: '',
      publisher: '',
      category: 'Yazılım',
      totalCopies: 3,
      locationShelf: 'Raf A-01',
      coverUrl: '',
      description: ''
    });
  };

  const openEditModal = (b: Book) => {
    setEditingBook(b);
    setBookForm({
      title: b.title,
      isbn: b.isbn,
      author: b.author,
      publisher: b.publisher,
      category: b.category,
      totalCopies: b.totalCopies,
      locationShelf: b.locationShelf,
      coverUrl: b.coverUrl || '',
      description: b.description || ''
    });
    setShowAddBookModal(true);
  };

  // Delete Book
  const handleDeleteBook = async (id: string) => {
    if (!confirm('Bu kitabı silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/books/${id}`);
      setSuccessMsg('Kitap başarıyla silindi.');
      await fetchDashboardData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Kitap silinirken hata oluştu.');
    }
  };

  // Issue Loan submit
  const handleIssueLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const res = await api.post('/loans/issue', issueForm);
      if (res.data) {
        setSuccessMsg('Kitap kullanıcıya başarıyla ödünç verildi.');
        setShowIssueModal(false);
        await fetchDashboardData();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Ödünç verme işlemi başarısız.');
    }
  };

  // Return Loan action
  const handleReturnLoan = async (loanId: string) => {
    try {
      const res = await api.post(`/loans/return/${loanId}`);
      if (res.data) {
        setSuccessMsg('Eser başarıyla kütüphaneye iade alındı.');
        setShowQrScanModal(false);
        await fetchDashboardData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'İade alınırken hata oluştu.');
    }
  };

  if (isLoading || loading || !mounted) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
        <div className="w-8 h-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold text-slate-500">Yönetim Paneli yükleniyor...</p>
      </div>
    );
  }

  // Filter books
  const filteredBooks = books.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.author.toLowerCase().includes(search.toLowerCase()) ||
      b.isbn.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = categoryFilter === 'Tümü' || b.category === categoryFilter;

    const matchesStock =
      stockFilter === 'Tümü' ||
      (stockFilter === 'Stokta Var' && b.availableCopies > 0) ||
      (stockFilter === 'Tükendi' && b.availableCopies === 0);

    return matchesSearch && matchesCategory && matchesStock;
  });

  // Pagination logic
  const totalItems = filteredBooks.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentBooks = filteredBooks.slice(startIndex, endIndex);

  const categories = ['Tümü', 'Yazılım', 'Edebiyat', 'Tarih', 'Felsefe', 'Bilim Kurgu', 'Ekonomi'];

  const activeLoansCount = loans.filter((l) => l.status === 'ACTIVE').length;
  const overdueLoansCount = loans.filter((l) => l.status === 'OVERDUE').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200 text-xs font-bold mb-2">
            <LayoutDashboard className="w-3.5 h-3.5" /> Kütüphane Bilgi Sistemi v2.4 | Envanter & Raporlar
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Katalog & Ödünç Yönetim Paneli</h1>
          <p className="text-xs text-slate-500 mt-1">
            Sayın <strong>{user?.fullName}</strong> ({user?.role}), akademik koleksiyonları ve raporları yönetebilirsiniz.
          </p>
        </div>

        <button
          onClick={() => {
            setQrCodeInput('');
            setScannedLoan(null);
            setQrScanError(null);
            setShowQrScanModal(true);
          }}
          className="px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm flex items-center gap-2"
        >
          <Camera className="w-4 h-4 text-blue-400" /> QR Kod İle Hızlı İade Al
        </button>
      </div>

      {/* Alert Messages */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)}>
            <X className="w-4 h-4 text-emerald-600" />
          </button>
        </div>
      )}

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-2xl font-bold text-slate-900">{books.length}</span>
            <span className="text-xs text-slate-500 font-medium">Toplam Kitap Sayısı</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-2xl font-bold text-slate-900">{activeLoansCount}</span>
            <span className="text-xs text-slate-500 font-medium">Aktif Ödünç Verilen</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-200">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-2xl font-bold text-slate-900">{overdueLoansCount}</span>
            <span className="text-xs text-slate-500 font-medium">Geciken İadeler</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-2xl font-bold text-slate-900">{analytics?.totalFineRevenue || 75} TL</span>
            <span className="text-xs text-slate-500 font-medium">Tahsil Edilen Ceza Geliri</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('books')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'books'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BookMarked className="w-4 h-4" /> Kitap Yönetimi ({books.length})
        </button>
        <button
          onClick={() => setActiveTab('loans')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'loans'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <RotateCcw className="w-4 h-4" /> Ödünç & İade Hareketleri ({loans.length})
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'analytics'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-amber-400" /> İstatistikler & Analytics
        </button>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => router.push('/admin/users')}
            className="px-4 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
          >
            <Users className="w-4 h-4 text-purple-200" /> Öğrenci & Üye Takibi
          </button>
          <button
            onClick={() => router.push('/admin/desks')}
            className="px-4 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            <Building className="w-4 h-4 text-blue-200" /> Masa & Kat Yönetimi
          </button>
        </div>
      </div>

      {/* TAB 1: KITAP YONETIMI */}
      {activeTab === 'books' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Başlık, yazar veya ISBN..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-700 focus:outline-none focus:border-slate-900"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    Kategori: {c}
                  </option>
                ))}
              </select>

              <select
                value={stockFilter}
                onChange={(e) => {
                  setStockFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-700 focus:outline-none focus:border-slate-900"
              >
                <option value="Tümü">Stok: Tümü</option>
                <option value="Stokta Var">Stokta Var</option>
                <option value="Tükendi">Tükendi</option>
              </select>
            </div>

            <button
              onClick={() => {
                setEditingBook(null);
                resetBookForm();
                setShowAddBookModal(true);
              }}
              className="w-full md:w-auto px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
            >
              <PlusCircle className="w-4 h-4" /> Yeni Kitap Kaydı
            </button>
          </div>

          <div className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Eser & Kapak</th>
                    <th className="px-4 py-3">Yazar</th>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3">Stok Durumu</th>
                    <th className="px-4 py-3">Raf Konumu</th>
                    <th className="px-4 py-3 text-right">Aksiyonlar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {currentBooks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500 font-medium">
                        Kayıtlı kitap bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    currentBooks.map((b, idx) => (
                      <tr
                        key={b.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          idx % 2 === 1 ? 'bg-slate-50/30' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-14 bg-slate-100 rounded overflow-hidden flex-shrink-0 border border-slate-200">
                              {b.coverUrl ? (
                                <img src={b.coverUrl} alt={b.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                  <BookOpen className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 line-clamp-1">{b.title}</div>
                              <span className="text-[10px] text-slate-500 font-mono">ISBN: {b.isbn}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">{b.author}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                            {b.category}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${
                              b.availableCopies > 0
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {b.availableCopies} / {b.totalCopies} Kopya
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600">{b.locationShelf}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setActivePdfBook(b)}
                              className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200 flex items-center gap-1 shadow-sm"
                              title="E-Kitap Oku (PDF)"
                            >
                              <FileText className="w-3.5 h-3.5 text-blue-600" />
                              <span>E-Kitap</span>
                            </button>

                            <button
                              onClick={() => setInspectBook(b)}
                              className="p-1.5 rounded bg-white text-slate-700 hover:bg-slate-100 border border-slate-300"
                              title="İncele & QR Kod"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openEditModal(b)}
                              className="p-1.5 rounded bg-white text-slate-700 hover:bg-slate-100 border border-slate-300"
                              title="Düzenle"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            {user?.role === 'ADMIN' && (
                              <button
                                onClick={() => handleDeleteBook(b.id)}
                                className="p-1.5 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                                title="Sil"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <div>
                Toplam <strong>{totalItems}</strong> kayıttan{' '}
                <strong>{totalItems > 0 ? startIndex + 1 : 0}</strong> - <strong>{endIndex}</strong> arası gösteriliyor.
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="p-1.5 rounded bg-white border border-slate-300 text-slate-700 disabled:opacity-40 hover:bg-slate-100"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="font-semibold text-slate-800">
                  Sayfa {currentPage} / {totalPages}
                </span>

                <button
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="p-1.5 rounded bg-white border border-slate-300 text-slate-700 disabled:opacity-40 hover:bg-slate-100"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ODUNC & IADE ISLEMLERI */}
      {activeTab === 'loans' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowIssueModal(true)}
              className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 shadow-sm"
            >
              <PlusCircle className="w-4 h-4" /> Üyeye Kitap Ödünç Ver
            </button>
          </div>

          <div className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Üye Adı & E-posta</th>
                    <th className="px-4 py-3">Ödünç Verilen Eser</th>
                    <th className="px-4 py-3">Son Teslim Tarihi</th>
                    <th className="px-4 py-3">Durum</th>
                    <th className="px-4 py-3">Gecikme Cezası</th>
                    <th className="px-4 py-3 text-right">Aksiyon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loans.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500">
                        Henüz aktif ödünç kaydı bulunmuyor.
                      </td>
                    </tr>
                  ) : (
                    loans.map((l, idx) => (
                      <tr key={l.id} className={`hover:bg-slate-50/80 ${idx % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          <div>{l.user?.fullName || 'Bilinmiyor'}</div>
                          <span className="text-[10px] text-slate-500">{l.user?.email}</span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">{l.book?.title}</td>
                        <td className="px-4 py-3 text-amber-700 font-semibold">
                          {new Date(l.dueDate).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                              l.status === 'ACTIVE'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : l.status === 'OVERDUE'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {l.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-rose-700">
                          {l.fineAmount > 0 ? `${l.fineAmount} TL` : '0 TL'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {l.status !== 'RETURNED' && (
                            <button
                              onClick={() => handleReturnLoan(l.id)}
                              className="px-3 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 font-bold transition-all text-xs"
                            >
                              İade Al
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
      )}

      {/* TAB 3: ISTANBUL UNIVERSITY ANALYTICS CHARTS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Pie Chart */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-900" /> Kategoriye Göre Kitap Dağılımı
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics?.categoryData || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="count"
                      label={(entry: any) => `${entry.name} (${entry.count || 0})`}
                    >
                      {(analytics?.categoryData || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly Bar Chart */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" /> Aylık Ödünç ve İade Hareketleri (Son 6 Ay)
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.monthlyData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="loans" name="Ödünç Alınan" fill="#0f172a" />
                    <Bar dataKey="returns" name="İade Edilen" fill="#059669" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Leaderboard Table */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" /> En Çok Okuyan Öğrenciler (Liderlik Tablosu)
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Top 5 Aktif Okuyucu</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-2.5">Sıra</th>
                    <th className="px-4 py-2.5">Öğrenci Adı</th>
                    <th className="px-4 py-2.5">E-posta Adresi</th>
                    <th className="px-4 py-2.5 text-right">Toplam Okunan Kitap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(analytics?.topStudents || []).map((student, idx) => (
                    <tr key={student.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-900">#{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{student.fullName}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono">{student.email}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-extrabold text-xs">
                          {student.borrowedCount} Kitap
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: QR KOD ILE CANLI WEBCAM HIZLI IADE */}
      {showQrScanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg p-6 rounded-2xl border border-slate-200 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-slate-900" />
                <h3 className="text-base font-bold text-slate-900">Canlı Kamera İle QR Hızlı İade</h3>
              </div>
              <button onClick={() => setShowQrScanModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {qrScanError && (
              <p className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-lg border border-rose-200">{qrScanError}</p>
            )}

            {/* LIVE WEBCAM SCANNER FEED */}
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <Scan className="w-4 h-4 text-blue-600" /> Canlı Kamera Akışı (Kitabın QR Kodunu Tutun)
                </span>
                <div id="qr-reader" className="w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-50" />
              </div>

              {/* SCANNED RESULT CARD */}
              {scannedLoan && (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                  <div className="font-bold text-emerald-950 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {scannedLoan.book.title}
                  </div>
                  <p className="text-xs text-emerald-800">
                    Ödünç Alan: <strong>{scannedLoan.user.fullName}</strong> ({scannedLoan.user.email})
                  </p>
                  <p className="text-[11px] text-emerald-700 font-mono">ISBN: {scannedLoan.book.isbn}</p>
                  <p className="text-xs text-emerald-900 font-semibold">
                    Son Teslim Tarihi: {new Date(scannedLoan.dueDate).toLocaleDateString('tr-TR')}
                  </p>

                  {scannedLoan.fineAmount > 0 && (
                    <div className="p-2 rounded bg-rose-50 text-rose-700 font-bold border border-rose-200">
                      Gecikme Cezası: {scannedLoan.fineAmount} TL
                    </div>
                  )}

                  <button
                    onClick={() => handleReturnLoan(scannedLoan.id)}
                    className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm mt-2 flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> İadeyi Onayla ve Envantere Kaydet
                  </button>
                </div>
              )}

              {/* MANUAL INPUT FALLBACK */}
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-slate-700 font-semibold mb-1 text-[11px]">
                  Yedek Manuel Girdi (QR Metni / ISBN / Başlık)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="QR kodu yapıştırın veya manuel girin..."
                    value={qrCodeInput}
                    onChange={(e) => setQrCodeInput(e.target.value)}
                    className="flex-1 p-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 font-mono text-xs focus:outline-none focus:border-slate-900"
                  />
                  <button
                    onClick={() => handleQrLookup(qrCodeInput)}
                    className="px-4 py-2 rounded-lg bg-slate-900 text-white font-bold text-xs"
                  >
                    Sorgula
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Kitap İncele & QR Kod */}
      {inspectBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md p-6 rounded-2xl border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">Eser Detay & QR Barkod</h3>
              <button onClick={() => setInspectBook(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <QRCodeSVG value={inspectBook.isbn} size={140} />
              <span className="text-[10px] font-mono text-slate-500">ISBN QR Barkod: {inspectBook.isbn}</span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="font-bold text-base text-slate-900">{inspectBook.title}</div>
              <p className="text-slate-600 font-semibold">Yazar: {inspectBook.author}</p>
              <p className="text-slate-500">Yayınevi: {inspectBook.publisher} | Kategori: {inspectBook.category}</p>
              <p className="text-slate-700 font-bold">Raf Konumu: {inspectBook.locationShelf}</p>
            </div>

            <button
              onClick={() => setInspectBook(null)}
              className="w-full py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Yeni Kitap Ekle / Düzenle */}
      {showAddBookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-lg p-6 rounded-2xl border border-slate-200 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingBook ? 'Kitap Bilgilerini Güncelle' : 'Yeni Kitap Kaydı Ekle'}
              </h3>
              <button onClick={() => setShowAddBookModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {errorMsg && <p className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-lg border border-rose-200">{errorMsg}</p>}

            <form onSubmit={handleSaveBook} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Kitap Başlığı</label>
                <input
                  type="text"
                  required
                  value={bookForm.title}
                  onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                  className="w-full p-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Yazar</label>
                  <input
                    type="text"
                    required
                    value={bookForm.author}
                    onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">ISBN</label>
                  <input
                    type="text"
                    required
                    value={bookForm.isbn}
                    onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Yayınevi</label>
                  <input
                    type="text"
                    required
                    value={bookForm.publisher}
                    onChange={(e) => setBookForm({ ...bookForm, publisher: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Kategori</label>
                  <input
                    type="text"
                    required
                    value={bookForm.category}
                    onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Toplam Kopya</label>
                  <input
                    type="number"
                    min={1}
                    value={bookForm.totalCopies}
                    onChange={(e) => setBookForm({ ...bookForm, totalCopies: Number(e.target.value) })}
                    className="w-full p-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Raf Konumu</label>
                  <input
                    type="text"
                    required
                    value={bookForm.locationShelf}
                    onChange={(e) => setBookForm({ ...bookForm, locationShelf: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <button type="submit" className="w-full py-2.5 rounded-lg bg-slate-900 text-white font-bold text-xs mt-2">
                {editingBook ? 'Değişiklikleri Kaydet' : 'Kitabı Envantere Kaydet'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Üyeye Kitap Ödünç Ver */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md p-6 rounded-2xl border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">Üyeye Kitap Ödünç Ver</h3>
              <button onClick={() => setShowIssueModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleIssueLoan} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Kullanıcı ID (UUID)</label>
                <input
                  type="text"
                  required
                  placeholder="Kullanıcı ID'sini girin..."
                  value={issueForm.userId}
                  onChange={(e) => setIssueForm({ ...issueForm, userId: e.target.value })}
                  className="w-full p-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Eser Seçimi</label>
                <select
                  value={issueForm.bookId}
                  onChange={(e) => setIssueForm({ ...issueForm, bookId: e.target.value })}
                  className="w-full p-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                >
                  <option value="">Eser Seçin...</option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} (Stok: {b.availableCopies})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Son Teslim Tarihi</label>
                <input
                  type="date"
                  required
                  value={issueForm.dueDate}
                  onChange={(e) => setIssueForm({ ...issueForm, dueDate: e.target.value })}
                  className="w-full p-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                />
              </div>

              <button type="submit" className="w-full py-2.5 rounded-lg bg-slate-900 text-white font-bold text-xs mt-2">
                Ödünç Verme İşlemini Onayla
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EMBEDDED PDF VIEWER MODAL */}
      <PdfViewerModal
        isOpen={!!activePdfBook}
        onClose={() => setActivePdfBook(null)}
        title={activePdfBook?.title || ''}
        author={activePdfBook?.author}
        pdfUrl={activePdfBook?.pdfUrl}
      />
    </div>
  );
}
