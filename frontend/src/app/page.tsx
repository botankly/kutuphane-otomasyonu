'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import {
  BookOpen,
  Search,
  BookMarked,
  CheckCircle2,
  Bookmark,
  X,
  MapPin,
  Layers,
  ShieldCheck,
  Building2,
  Calendar,
  Clock,
  AlertCircle,
  Star,
  MessageSquare,
  Send,
  UserCheck,
  QrCode,
  Info,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Pause,
  FileText,
  ChevronLeft,
  ChevronRight,
  Camera,
  Download
} from 'lucide-react';
import PdfViewerModal from '@/components/PdfViewerModal';
import WebcamScannerModal from '@/components/WebcamScannerModal';

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

interface ReviewItem {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  user: {
    fullName: string;
  };
}

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const BOOKS_PER_PAGE = 12;

  // Modals
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [borrowBookTarget, setBorrowBookTarget] = useState<Book | null>(null);
  const [activePdfBook, setActivePdfBook] = useState<Book | null>(null);

  // Voice Search State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Text-To-Speech State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Reviews State inside Modal
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [averageRating, setAverageRating] = useState(5.0);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [reviewSubmitLoading, setReviewSubmitLoading] = useState(false);

  // Borrow Date form
  const defaultDueDate = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
  const minDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const [dueDateInput, setDueDateInput] = useState(defaultDueDate);
  const [borrowLoading, setBorrowLoading] = useState(false);
  const [borrowError, setBorrowError] = useState<string | null>(null);
  const [notificationBanner, setNotificationBanner] = useState<string | null>(null);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [pwaPrompt, setPwaPrompt] = useState<any>(null);
  const [showPwaBanner, setShowPwaBanner] = useState(false);

  const [liveOccupancy, setLiveOccupancy] = useState({
    totalDesks: 90,
    occupiedDesks: 0,
    occupancyRate: 0,
    availableDesks: 90,
    statusText: 'Müsait (Boş Salonlar)',
    nightShiftInfo: {
      isOpen724: true,
      title: '🌙 7/24 Açık Salon | ☕ Sıcak Çorba & Kahve İkramı',
      details: '23:30 - 01:00 Arasında Zemin Kat Yemekhanede Öğrencilerimize Ücretsizdir!'
    }
  });

  useEffect(() => {
    fetchLiveOccupancy();

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setPwaPrompt(e);
      setShowPwaBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPwa = async () => {
    if (pwaPrompt) {
      pwaPrompt.prompt();
      const choice = await pwaPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setShowPwaBanner(false);
      }
    }
  };

  const fetchLiveOccupancy = async () => {
    try {
      const res = await api.get('/stats/live-occupancy');
      if (res.data?.data) {
        setLiveOccupancy(res.data.data);
      }
    } catch (e) {
      // Fallback defaults
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [search, selectedCategory]);

  useEffect(() => {
    // Cleanup TTS on unmount or modal close
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (selectedCategory !== 'Tümü') params.category = selectedCategory;

      const res = await api.get('/books', { params });
      if (res.data?.data?.books) {
        setBooks(res.data.data.books);
      }
    } catch (err) {
      console.error('Kitaplar çekilerken hata oluştu:', err);
    } finally {
      setLoading(false);
    }
  };

  // WEB SPEECH API (SESLI ARAMA)
  const toggleVoiceSearch = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Tarayıcınız sesli arama özelliğini desteklemiyor (Chrome/Edge önerilir).');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'tr-TR';
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setNotificationBanner('🎙️ Dinleniyor... Lütfen arama kelimenizi söyleyin.');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearch(transcript);
        setIsListening(false);
        setNotificationBanner(`🎙️ Algılanan Arama: "${transcript}"`);
      };

      recognition.onerror = (event: any) => {
        console.error('Sesli arama hatası:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Mikrofon başlatılamadı:', err);
      setIsListening(false);
    }
  };

  // SPEECH SYNTHESIS API (KİTAP SESLENDİRME)
  const handleToggleSpeech = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      alert('Tarayıcınız seslendirme (Text-to-Speech) özelliğini desteklemiyor.');
      return;
    }

    const synth = window.speechSynthesis;

    if (isSpeaking) {
      if (isPaused) {
        synth.resume();
        setIsPaused(false);
      } else {
        synth.pause();
        setIsPaused(true);
      }
      return;
    }

    synth.cancel(); // Stop any ongoing speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'tr-TR';
    utterance.rate = 1.0;

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    synth.speak(utterance);
    setIsSpeaking(true);
    setIsPaused(false);
  };

  const stopSpeech = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  };

  const fetchBookReviews = async (bookId: string) => {
    setReviewsLoading(true);
    try {
      const res = await api.get(`/books/${bookId}/reviews`);
      if (res.data?.data) {
        setReviews(res.data.data.reviews || []);
        setAverageRating(res.data.data.averageRating || 5.0);
      }
    } catch (err) {
      console.error('Yorumlar çekilemedi:', err);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleOpenDetailModal = (book: Book, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    stopSpeech();
    setSelectedBook(book);
    setNewRating(5);
    setNewComment('');
    fetchBookReviews(book.id);
  };



  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    setReviewSubmitLoading(true);
    try {
      await api.post(`/books/${selectedBook.id}/reviews`, {
        rating: newRating,
        comment: newComment
      });

      setNewComment('');
      fetchBookReviews(selectedBook.id);
      setNotificationBanner('⭐ Yorumunuz ve puanınız başarıyla eklendi.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Yorum eklenirken hata oluştu.');
    } finally {
      setReviewSubmitLoading(false);
    }
  };

  const handleReserveBook = async (book: Book, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    try {
      await api.post('/reservations', { bookId: book.id });
      setNotificationBanner(`"${book.title}" eseri için bekleme sırasına başarıyla kaydolundunuz.`);
      setSelectedBook(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Rezervasyon sırasında hata oluştu.');
    }
  };

  const handleOpenBorrowModal = (book: Book, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    setBorrowBookTarget(book);
    setDueDateInput(defaultDueDate);
    setBorrowError(null);
    setSelectedBook(null);
  };

  const handleConfirmBorrow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!borrowBookTarget) return;

    setBorrowError(null);
    setBorrowLoading(true);

    try {
      const res = await api.post('/loans/borrow', {
        bookId: borrowBookTarget.id,
        dueDate: dueDateInput
      });

      if (res.data) {
        setNotificationBanner(`📖 "${borrowBookTarget.title}" eseri hesabınıza ödünç tanımlandı.`);
        setBorrowBookTarget(null);
        await fetchBooks();
      }
    } catch (err: any) {
      setBorrowError(err.response?.data?.message || 'Ödünç alma işlemi başarısız.');
    } finally {
      setBorrowLoading(false);
    }
  };

  const calculateDaysDiff = (dateStr: string) => {
    const selected = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = selected.getTime() - today.getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const categories = [
    'Tümü',
    'Yazılım',
    'Edebiyat',
    'Tarih',
    'Felsefe',
    'Bilim Kurgu',
    'Ekonomi',
    'Psikoloji',
    'Hukuk',
    'Mühendislik'
  ];

  const filteredBooks = books.filter((b) => {
    const matchesCat = selectedCategory === 'Tümü' || b.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = !search || (
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.author.toLowerCase().includes(search.toLowerCase()) ||
      b.isbn.includes(search)
    );
    return matchesCat && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / BOOKS_PER_PAGE));
  const paginatedBooks = filteredBooks.slice((currentPage - 1) * BOOKS_PER_PAGE, currentPage * BOOKS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, search]);

  const totalBooksCount = books.length;
  const totalAvailableCount = books.reduce((acc, b) => acc + b.availableCopies, 0);
  const categoriesCount = new Set(books.map((b) => b.category)).size;

  return (
    <div className="space-y-10 pb-16 bg-slate-50 min-h-screen">
      {/* INSTITUTIONAL HERO HEADER */}
      <section className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
              <Building2 className="w-3.5 h-3.5 text-slate-900" />
              <span>Kütüphane ve Dokümantasyon Daire Başkanlığı</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Üniversite Genel Kataloğu & Dijital Kaynak Arama
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
              Kütüphane kolleksiyonumuzda bulunan akademik yayınları, basılı kitapları ve dijital e-kitapları arayabilir, doğrudan tarayıcı içinde okuyabilir ve sesli dinleyebilirsiniz.
            </p>
          </div>

          <div className="w-full md:w-auto flex flex-row sm:flex-col gap-3">
            {!isAuthenticated ? (
              <Link
                href="/login"
                className="w-full px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs text-center shadow-sm transition-all"
              >
                Üye Girişi Yap
              </Link>
            ) : (
              <Link
                href="/my-loans"
                className="w-full px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs text-center shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                <Bookmark className="w-4 h-4 text-blue-400" /> Ödünç Takip
              </Link>
            )}
          </div>
        </div>

        {/* CANLI KÜTÜPHANE DURUMU & İKRAM BİLDİRİM BARI */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-4 border-t border-slate-100">
          {/* LIVE OCCUPANCY PROGRESS BAR CARD (7 Cols) */}
          <div className="md:col-span-7 bg-white text-slate-900 p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden group">
            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600"></span>
                </span>
                <span className="font-extrabold text-xs tracking-wider text-slate-900 uppercase">
                  Canlı Doluluk Oranı
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                {liveOccupancy.statusText}
              </span>
            </div>

            <div className="my-3 z-10 space-y-2">
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-black text-slate-900 tracking-tight flex items-baseline gap-2">
                  %{liveOccupancy.occupancyRate} Dolu
                  <span className="text-xs font-semibold text-slate-500">
                    ({liveOccupancy.occupiedDesks}/{liveOccupancy.totalDesks} Masa Kullanımda)
                  </span>
                </div>
                <span className="text-xs text-blue-600 font-bold">
                  {liveOccupancy.totalDesks - liveOccupancy.occupiedDesks} Boş Masa Var
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-700 shadow-sm"
                  style={{ width: `${Math.min(100, liveOccupancy.occupancyRate)}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 z-10 pt-1">
              <span>Zemin + 1. Kat + 2. Kat Salonları</span>
              <Link href="/desk-reservation" className="text-blue-600 hover:underline font-bold flex items-center gap-1">
                Bireysel Masa Rezerve Et &rarr;
              </Link>
            </div>
          </div>

          {/* NIGHT SHIFT & FREE TREAT CARD (5 Cols) */}
          <div className="md:col-span-5 bg-white text-slate-900 p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-extrabold uppercase">
                🌙 7/24 Nöbetçi Kütüphane
              </span>
            </div>

            <div className="my-2 space-y-1">
              <h3 className="text-sm font-bold text-slate-900 leading-snug">
                ☕ Sıcak Çorba & Kahve İkramı Bildirimi
              </h3>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Gece sınav haftası boyunca <strong>23:30 - 01:00</strong> arasında Zemin Kat Yemekhanede ücretsiz sıcak çorba, taze çay ve filtre kahve ikramı servis edilmektedir.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between text-[10px] text-slate-500 font-semibold border-t border-slate-100">
              <span>📍 Zemin Kat Kafeterya</span>
              <span className="text-blue-600 font-bold">Afiyet Olsun! 🍲</span>
            </div>
          </div>
        </div>
      </section>

      {/* Banner */}
      {notificationBanner && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <span>{notificationBanner}</span>
          </div>
          <button onClick={() => setNotificationBanner(null)}>
            <X className="w-4 h-4 text-blue-600" />
          </button>
        </div>
      )}

      {/* DYNAMIC LIVE STATS BAR */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-2xl font-bold text-slate-900">{totalBooksCount}</span>
            <span className="text-[11px] text-slate-500 font-medium">Kayıtlı Başlık</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-2xl font-bold text-slate-900">{totalAvailableCount}</span>
            <span className="text-[11px] text-slate-500 font-medium">Raf Stok Sayısı</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-2xl font-bold text-slate-900">
              {categories.length - 1}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Aktif Kategori</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-2xl font-bold text-slate-900">Aktif</span>
            <span className="text-[11px] text-slate-500 font-medium">Otomasyon Durumu</span>
          </div>
        </div>
      </section>

      {/* CATALOG SECTION WITH VOICE SEARCH */}
      <section id="katalog" className="space-y-6 scroll-mt-24">
        {/* Search & Category Filter Bar */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight self-start md:self-center">
              Katalog Arama ve Tarama
            </h2>

            {/* SEARCH INPUT WITH VOICE & WEBCAM BARCODE BUTTONS */}
            <div className="relative w-full md:w-96 flex items-center gap-2">
              <div className="relative w-full flex items-center">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Başlık, yazar veya ISBN ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white transition-colors"
                />

                <button
                  onClick={toggleVoiceSearch}
                  className={`absolute right-2 p-1.5 rounded-md transition-all ${
                    isListening
                      ? 'bg-rose-600 text-white animate-bounce'
                      : 'text-slate-400 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                  title={isListening ? 'Dinleniyor...' : 'Sesli Arama Yap (Türkçe)'}
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => setShowCameraScanner(true)}
                className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 whitespace-nowrap shadow-sm transition-all"
                title="Kamera ile Kitap Barkodu Tara"
              >
                <Camera className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Barkod Tara</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Book Grid */}
        {loading ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <div className="w-8 h-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold text-slate-500">Katalog verileri yükleniyor...</p>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 space-y-2">
            <BookMarked className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">Arama veya kategori sonucunda eser bulunamadı.</h3>
            <p className="text-xs text-slate-500">Lütfen arama terimlerinizi veya seçtiğiniz kategoriyi değiştirin.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedBooks.map((book) => (
                <div
                  key={book.id}
                  onClick={() => handleOpenDetailModal(book)}
                  className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between cursor-pointer group"
                >
                  {/* Book Thumbnail */}
                  <div className="relative h-48 w-full bg-slate-100 overflow-hidden flex items-center justify-center border-b border-slate-100">
                    {book.coverUrl ? (
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80';
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-slate-400">
                        <BookOpen className="w-10 h-10" />
                        <span className="text-[10px] uppercase font-bold tracking-wider">Görsel Yok</span>
                      </div>
                    )}

                    <div className="absolute top-3 left-3 flex items-center gap-1">
                      <span className="px-2.5 py-0.5 rounded-md bg-white/90 backdrop-blur-sm text-slate-800 border border-slate-200 text-[10px] font-bold shadow-sm">
                        {book.category}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border shadow-sm ${
                          book.availableCopies > 0
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        {book.availableCopies > 0 ? `Stokta (${book.availableCopies})` : 'Stoğu Tükenmiş'}
                      </span>
                    </div>
                  </div>

                  {/* Card Info */}
                  <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-900 transition-colors line-clamp-1">
                        {book.title}
                      </h3>
                      <p className="text-xs text-slate-600 font-medium">Yazar: {book.author}</p>
                      {book.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{book.description}</p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <MapPin className="w-3 h-3 text-slate-500" /> {book.locationShelf}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePdfBook(book);
                          }}
                          className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold text-[11px] border border-blue-200 transition-all flex items-center gap-1 shadow-sm"
                          title="Tam Metin E-Kitap Oku"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-600" /> E-Kitap Oku
                        </button>

                        <button
                          onClick={(e) => handleOpenDetailModal(book, e)}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] border border-slate-200 transition-all flex items-center gap-1"
                        >
                          <Info className="w-3 h-3 text-slate-600" /> Detaylar
                        </button>

                        {book.availableCopies > 0 ? (
                          <button
                            onClick={(e) => handleOpenBorrowModal(book, e)}
                            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] shadow-sm transition-all flex items-center gap-1"
                          >
                            <Clock className="w-3 h-3 text-blue-300" /> Ödünç Al
                          </button>
                        ) : (
                          <button
                            onClick={(e) => handleReserveBook(book, e)}
                            className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-sm transition-all flex items-center gap-1"
                          >
                            <UserCheck className="w-3 h-3" /> Sıraya Gir
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* CATALOG PAGINATION CONTROLS BAR */}
            {filteredBooks.length > 0 && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-600 font-medium">
                  Toplam <strong className="text-slate-900 font-bold">{filteredBooks.length}</strong> eserden{' '}
                  <strong className="text-blue-700 font-bold">
                    {Math.min((currentPage - 1) * BOOKS_PER_PAGE + 1, filteredBooks.length)} -{' '}
                    {Math.min(currentPage * BOOKS_PER_PAGE, filteredBooks.length)}
                  </strong>{' '}
                  arası gösteriliyor (Sayfa {currentPage} / {totalPages})
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => {
                      setCurrentPage((prev) => Math.max(prev - 1, 1));
                      document.getElementById('katalog')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 disabled:opacity-40 transition-all flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" /> Önceki
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                      let pageNum = currentPage;
                      if (totalPages <= 5) pageNum = idx + 1;
                      else if (currentPage <= 3) pageNum = idx + 1;
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + idx;
                      else pageNum = currentPage - 2 + idx;

                      return (
                        <button
                          key={pageNum}
                          onClick={() => {
                            setCurrentPage(pageNum);
                            document.getElementById('katalog')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                            currentPage === pageNum
                              ? 'bg-slate-900 text-white shadow-sm'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => {
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages));
                      document.getElementById('katalog')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 disabled:opacity-40 transition-all flex items-center gap-1"
                  >
                    Sonraki <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* BOOK DETAILS MODAL WITH TEXT-TO-SPEECH (SPEECH SYNTHESIS) */}
      {selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-2xl overflow-hidden border border-slate-200 shadow-xl space-y-6 p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                stopSpeech();
                setSelectedBook(null);
              }}
              className="absolute top-5 right-5 p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-900 border border-slate-200 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Info */}
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Cover Image */}
              <div className="w-full sm:w-48 h-64 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 border border-slate-200 shadow-sm">
                {selectedBook.coverUrl ? (
                  <img src={selectedBook.coverUrl} alt={selectedBook.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                    <BookOpen className="w-10 h-10" />
                    <span className="text-[10px] font-bold">Görsel Yok</span>
                  </div>
                )}
              </div>

              {/* Book Information */}
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
                    {selectedBook.category}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${
                      selectedBook.availableCopies > 0
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {selectedBook.availableCopies > 0
                      ? `Stokta Var (${selectedBook.availableCopies} Kopya)`
                      : 'Stoğu Tükenmiş (Sıradasınız)'}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">{selectedBook.title}</h2>
                <p className="text-xs font-semibold text-slate-700">Yazar: {selectedBook.author}</p>

                {/* Rating Summary & TEXT TO SPEECH BUTTON */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs font-bold">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                    <span>Ortalama Puan: {averageRating} / 5.0</span>
                    <span className="text-slate-400 text-[10px]">({reviews.length} Değerlendirme)</span>
                  </div>

                  {/* SPEECH SYNTHESIS CONTROLLER */}
                  {selectedBook.description && (
                    <button
                      onClick={() =>
                        handleToggleSpeech(
                          `${selectedBook.title}. Yazar: ${selectedBook.author}. ${selectedBook.description}`
                        )
                      }
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 ${
                        isSpeaking
                          ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                          : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                      }`}
                    >
                      {isSpeaking ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span>{isPaused ? 'Devam Et' : 'Duraklat'}</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>🔊 Özeti Sesli Dinle</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="block text-slate-500 font-medium">Yayınevi</span>
                    <span className="font-semibold text-slate-800">{selectedBook.publisher}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 font-medium">Raf Konumu</span>
                    <span className="font-semibold text-slate-900">{selectedBook.locationShelf}</span>
                  </div>
                  <div className="col-span-2 border-t border-slate-200 pt-2">
                    <span className="block text-slate-500 font-medium">ISBN Numarası</span>
                    <span className="font-mono text-slate-700">{selectedBook.isbn}</span>
                  </div>
                </div>

                {selectedBook.description && (
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-700">Eser Özeti</span>
                    <p className="text-xs text-slate-600 leading-relaxed">{selectedBook.description}</p>
                  </div>
                )}
              </div>

              {/* DYNAMIC QR CODE DISPLAY BOX */}
              <div className="w-full md:w-44 flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2 flex-shrink-0">
                <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                  <QRCodeSVG value={selectedBook.isbn} size={110} />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-900 flex items-center justify-center gap-1">
                    <QrCode className="w-3 h-3 text-slate-700" /> Barkod QR Kodu
                  </span>
                  <span className="block text-[9px] text-slate-500 leading-tight">
                    Kütüphane Görevlisine Gösterin
                  </span>
                </div>
              </div>
            </div>

            {/* REVIEWS & RATINGS SECTION */}
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" /> Öğrenci Değerlendirmeleri & Yorumları
              </h3>

              {/* Add Review Form */}
              {isAuthenticated && (
                <form onSubmit={handleAddReview} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Değerlendirmeniz ve Yıldız Puanınız:</span>

                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewRating(star)}
                          className="p-1 hover:scale-110 transition-transform"
                        >
                          <Star
                            className={`w-4 h-4 ${
                              star <= newRating
                                ? 'fill-amber-400 text-amber-500'
                                : 'text-slate-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    rows={2}
                    required
                    placeholder="Bu eser hakkında görüşlerinizi paylaşın..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-slate-900 resize-none"
                  />

                  <button
                    type="submit"
                    disabled={reviewSubmitLoading}
                    className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 ml-auto"
                  >
                    <Send className="w-3.5 h-3.5" /> Yorumu Gönder
                  </button>
                </form>
              )}

              {/* Reviews List */}
              {reviewsLoading ? (
                <div className="text-center py-6 text-xs text-slate-400">Yorumlar yükleniyor...</div>
              ) : reviews.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                  Henüz bu eser için yorum yazılmamış. İlk yorumu siz yapın!
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {reviews.map((r) => (
                    <div key={r.id} className="pt-2 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">{r.user?.fullName}</span>
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          <span className="font-bold text-slate-700">{r.rating} / 5</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600">{r.comment}</p>
                      <span className="block text-[9px] text-slate-400">
                        {new Date(r.createdAt).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  stopSpeech();
                  setSelectedBook(null);
                }}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-all border border-slate-200"
              >
                Kapat
              </button>
              {selectedBook.availableCopies > 0 ? (
                <button
                  onClick={() => handleOpenBorrowModal(selectedBook)}
                  className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
                >
                  <Clock className="w-4 h-4 text-blue-300" /> Ödünç Alma & Tarih Seç
                </button>
              ) : (
                <button
                  onClick={() => handleReserveBook(selectedBook)}
                  className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
                >
                  <UserCheck className="w-4 h-4" /> Sıraya Gir / Rezerve Et
                </button>
              )}
            </div>
          </div>
        </div>
      )}



      {/* MODAL: Ödünç Alma & Tarih Seçimi */}
      {borrowBookTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md p-6 rounded-2xl border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">Eser Ödünç Alma & Tarih Belirleme</h3>
              <button onClick={() => setBorrowBookTarget(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {borrowError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{borrowError}</span>
              </div>
            )}

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-xs font-bold text-slate-900">{borrowBookTarget.title}</span>
              <p className="text-[11px] text-slate-600">Yazar: {borrowBookTarget.author} | Konum: {borrowBookTarget.locationShelf}</p>
            </div>

            <form onSubmit={handleConfirmBorrow} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-900" /> Teslim Etmek İstediğiniz Son Tarih
                </label>
                <input
                  type="date"
                  required
                  min={minDate}
                  max={maxDate}
                  value={dueDateInput}
                  onChange={(e) => setDueDateInput(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 font-medium focus:outline-none focus:border-slate-900"
                />
                <span className="block text-[10px] text-slate-500 mt-1">
                  Kütüphane yönetmeliği gereği ödünç alma süresi maksimum 30 gündür.
                </span>
              </div>

              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 flex items-center justify-between">
                <span className="font-semibold text-xs">Hesaplanan Ödünç Süresi:</span>
                <span className="font-extrabold text-sm text-blue-800">
                  {calculateDaysDiff(dueDateInput)} Gün
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBorrowBookTarget(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold border border-slate-200"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={borrowLoading}
                  className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-sm disabled:opacity-50"
                >
                  {borrowLoading ? 'İşleniyor...' : 'Ödünç Alma İşlemini Onayla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PWA INSTALL PROMPT BANNER */}
      {showPwaBanner && (
        <div className="fixed bottom-16 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-50 max-w-md bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-2xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom">
          <div className="space-y-0.5">
            <span className="font-bold text-xs text-amber-300 block">📱 Uygulamayı Ana Ekrana Ekle</span>
            <p className="text-[11px] text-slate-300">SmartLibrary'yi cihazınıza indirerek anlık bildirimler alın.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleInstallPwa}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-sm flex items-center gap-1 transition-all whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" /> Yükle
            </button>
            <button
              onClick={() => setShowPwaBanner(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* WEBCAM BARCODE SCANNER MODAL */}
      <WebcamScannerModal
        isOpen={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onScanSuccess={(scannedText) => {
          setSearch(scannedText);
          setNotificationBanner(`📷 Barkod Okundu: "${scannedText}" kataloğa aktarıldı.`);
        }}
        title="📷 Kitap Barkodu Tara"
        description="Kitabın arkasında veya kapağındaki ISBN / Barkod alanını kameraya gösterin."
      />

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
