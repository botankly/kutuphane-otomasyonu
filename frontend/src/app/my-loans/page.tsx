'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import {
  Bookmark,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BookOpen,
  CreditCard,
  X,
  ShieldCheck,
  Lock,
  RotateCcw,
  FileText
} from 'lucide-react';
import PdfViewerModal from '@/components/PdfViewerModal';

interface LoanItem {
  id: string;
  issueDate: string;
  dueDate: string;
  returnDate?: string | null;
  status: 'ACTIVE' | 'OVERDUE' | 'RETURNED';
  fineAmount: number;
  daysOverdue?: number;
  isPaid?: boolean;
  book: {
    id: string;
    title: string;
    isbn: string;
    author: string;
    category: string;
    locationShelf: string;
    coverUrl?: string | null;
    pdfUrl?: string | null;
  };
}

export default function MyLoansPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [loans, setLoans] = useState<LoanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePdfBook, setActivePdfBook] = useState<{ title: string; author?: string; pdfUrl?: string | null } | null>(null);

  // POS Payment Modal State
  const [payingLoan, setPayingLoan] = useState<LoanItem | null>(null);
  const [cardForm, setCardForm] = useState({
    cardHolder: '',
    cardNumber: '',
    expiry: '',
    cvc: ''
  });
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated) {
      fetchMyLoans();
    }
  }, [isAuthenticated, isLoading, router]);

  const fetchMyLoans = async () => {
    setLoading(true);
    try {
      const res = await api.get('/loans/my-loans');
      if (res.data && res.data.data && Array.isArray(res.data.data.loans)) {
        setLoans(res.data.data.loans);
      }
    } catch (err) {
      console.error('API veri çekme hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceiptPDF = async (loan: LoanItem) => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      // Institutional Header
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 35, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('UNIVERSITE KUTUPHANESI BILGI SISTEMI', 14, 18);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('RESMI ESER ODUNC ALMA VE TESLIM MAKBUZU', 14, 26);

      // Receipt Metadata
      doc.setTextColor(30, 41, 59); // slate-800
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Makbuz No: REC-${loan.id.substring(0, 8).toUpperCase()}`, 14, 48);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Duzenleme Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, 14, 55);

      // Line separator
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 60, 196, 60);

      // Member Information Section
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('UYE BILGILERI', 14, 70);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Uye Adi: ${user?.fullName || 'Ahmet Yilmaz'}`, 14, 78);
      doc.text(`E-Posta: ${user?.email || 'uye@kutuphane.com'}`, 14, 85);
      doc.text(`Rol: ${user?.role || 'MEMBER'}`, 14, 92);

      // Book Information Section
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('ESER BILGILERI', 14, 107);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Eser Basligi: ${loan.book.title}`, 14, 115);
      doc.text(`Yazar: ${loan.book.author}`, 14, 122);
      doc.text(`ISBN: ${loan.book.isbn}`, 14, 129);
      doc.text(`Kategori: ${loan.book.category}`, 14, 136);
      doc.text(`Raf Konumu: ${loan.book.locationShelf}`, 14, 143);

      // Borrow Dates Section
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('ODUNC VE TESLIM TARIHLERI', 14, 158);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Odunc Alma Tarihi: ${new Date(loan.issueDate).toLocaleDateString('tr-TR')}`, 14, 166);
      doc.text(`Son Teslim Tarihi: ${new Date(loan.dueDate).toLocaleDateString('tr-TR')}`, 14, 173);
      doc.text(`Durum: ${loan.status === 'RETURNED' ? 'Iade Edildi' : 'Aktif Odunc'}`, 14, 180);

      if (loan.fineAmount > 0) {
        doc.setTextColor(225, 29, 72);
        doc.text(`Gecikme Cezasi: ${loan.fineAmount} TL (${loan.isPaid ? 'Odedi' : 'Odenmedi'})`, 14, 187);
      }

      // Footer Note
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 200, 196, 200);

      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.text('* Bu makbuz Kutuphane Bilgi Yönetim Sistemi tarafindan dijital olarak olusturulmustur.', 14, 208);
      doc.text('* Gecikilen her gun icin gunluk 10 TL gecikme cezasi uygulanmaktadir.', 14, 214);
      doc.text('* Eser iadelerinde bu makbuzun gosterilmesi tavsiye edilir.', 14, 220);

      doc.save(`Odunc_Makbuzu_${loan.book.title.substring(0, 15).replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Makbuz PDF indirilemedi:', err);
      alert('Makbuz PDF oluşturulurken hata meydana geldi.');
    }
  };

  // Standard Return without fine
  const handleDirectReturn = async (loanId: string) => {
    if (!confirm('Bu kitabı iade etmek istediğinize emin misiniz?')) return;
    try {
      await api.post(`/loans/return/${loanId}`);
      setSuccessMsg('Eser kütüphaneye başarıyla iade edildi.');
      fetchMyLoans();
    } catch (err: any) {
      alert(err.response?.data?.message || 'İade işlemi sırasında hata oluştu.');
    }
  };

  // Open POS Payment Modal
  const openPosModal = (loan: LoanItem) => {
    setPayingLoan(loan);
    setCardForm({
      cardHolder: user?.fullName || '',
      cardNumber: '4543 •••• •••• 8912',
      expiry: '12/28',
      cvc: '382'
    });
    setPayError(null);
  };

  // POS Payment submit
  const handlePosPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingLoan) return;

    setPayError(null);
    setPayLoading(true);

    try {
      const res = await api.post(`/loans/pay-and-return/${payingLoan.id}`, cardForm);
      if (res.data) {
        setSuccessMsg(
          `💳 ${payingLoan.fineAmount} TL gecikme cezası sanal POS ile ödendi ve "${payingLoan.book.title}" iade alındı.`
        );
        setPayingLoan(null);
        await fetchMyLoans();
      }
    } catch (err: any) {
      setPayError(err.response?.data?.message || 'Sanal POS ödemesi başarısız oldu.');
    } finally {
      setPayLoading(false);
    }
  };

  // Compute days remaining or overdue
  const getDaysStatusBadge = (dueDateStr: string, status: string) => {
    if (status === 'RETURNED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" /> İade Edildi
        </span>
      );
    }

    const dueDate = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diff = dueDate.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) {
      const absDays = Math.abs(days);
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertTriangle className="w-3 h-3 text-rose-600" /> {absDays} Gün Gecikti (Günlük 10 TL Ceza)
        </span>
      );
    } else if (days === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <Clock className="w-3 h-3" /> Son Gün (Bugün Teslim)
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Clock className="w-3 h-3 text-emerald-600" /> {days} Gün Kaldı
        </span>
      );
    }
  };

  if (isLoading || loading) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="w-8 h-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold text-slate-500">Ödünç kayıtlarınız sorgulanıyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200 text-xs font-bold mb-2">
            <Bookmark className="w-3.5 h-3.5 text-slate-900" /> Üye Ödünç & İade Takip Paneli
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Ödünç Aldığım Eserler</h1>
          <p className="text-xs text-slate-500 mt-1">
            Sayın <strong>{user?.fullName}</strong>, kütüphanemizden aldığınız yayınların teslim tarihlerini ve iade makbuzlarını buradan yönetebilirsiniz.
          </p>
        </div>

        <div className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 flex items-center gap-3">
          <BookOpen className="w-7 h-7 text-slate-900" />
          <div>
            <span className="block text-xl font-bold text-slate-900">{loans.length}</span>
            <span className="text-[10px] text-slate-500 font-semibold uppercase">Toplam İşlem</span>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)}>
            <X className="w-4 h-4 text-emerald-600" />
          </button>
        </div>
      )}

      {/* Loans List */}
      {loans.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 space-y-2 shadow-sm">
          <Bookmark className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">Henüz ödünç alınmış bir eseriniz bulunmuyor.</h3>
          <p className="text-xs text-slate-500">Ana sayfadaki genel katalogdan dilediğiniz kitabı ödünç alabilirsiniz.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {loans.map((loan) => (
            <div
              key={loan.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
            >
              {/* Left Info & Cover */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-16 bg-slate-100 rounded overflow-hidden flex-shrink-0 border border-slate-200">
                  {loan.book.coverUrl ? (
                    <img src={loan.book.coverUrl} alt={loan.book.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <BookOpen className="w-4 h-4" />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 max-w-xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold">
                      {loan.book.category}
                    </span>
                    {getDaysStatusBadge(loan.dueDate, loan.status)}
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{loan.book.title}</h3>
                  <p className="text-xs text-slate-600">Yazar: {loan.book.author} | Raf: {loan.book.locationShelf}</p>
                  <p className="text-[10px] text-slate-400 font-mono">ISBN: {loan.book.isbn}</p>
                </div>
              </div>

              {/* Dates & Actions */}
              <div className="w-full md:w-auto flex flex-wrap items-center justify-between md:justify-end gap-3 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
                <div className="flex items-center gap-2 text-xs">
                  <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 space-y-0.5">
                    <span className="block text-[10px] text-slate-500 font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" /> Alma Tarihi
                    </span>
                    <span className="font-semibold text-slate-800">
                      {new Date(loan.issueDate).toLocaleDateString('tr-TR')}
                    </span>
                  </div>

                  <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 space-y-0.5">
                    <span className="block text-[10px] text-slate-500 font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-amber-600" /> Son Teslim
                    </span>
                    <span className="font-semibold text-amber-900">
                      {new Date(loan.dueDate).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </div>

                {/* E-BOOK PDF READ BUTTON */}
                <button
                  onClick={() => setActivePdfBook({ title: loan.book.title, author: loan.book.author, pdfUrl: loan.book.pdfUrl })}
                  className="px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition-all flex items-center gap-1.5 shadow-sm"
                  title="Tam Metin E-Kitap Oku"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-700" />
                  <span>📄 E-Kitap Oku</span>
                </button>

                {/* PDF RECEIPT DOWNLOAD BUTTON */}
                <button
                  onClick={() => handleDownloadReceiptPDF(loan)}
                  className="px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs border border-blue-200 transition-all flex items-center gap-1.5"
                  title="PDF Ödünç Makbuzu İndir"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-700" />
                  <span>PDF Makbuz</span>
                </button>

                {/* Fine & Action */}
                {loan.status !== 'RETURNED' && (
                  <div>
                    {loan.fineAmount > 0 && !loan.isPaid ? (
                      <button
                        onClick={() => openPosModal(loan)}
                        className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <CreditCard className="w-4 h-4" /> Ödeme Yap & İade Et ({loan.fineAmount} TL)
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDirectReturn(loan.id)}
                        className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-4 h-4 text-blue-300" /> Kütüphaneye İade Et
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SANAL POS KREDİ KARTI ÖDEME MODALI */}
      {payingLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md p-6 rounded-2xl border border-slate-200 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Sanal POS Ödeme Ekranı</h3>
                  <span className="block text-[10px] text-slate-500 font-semibold uppercase">3D Secure 256-bit Güvenli Ödeme</span>
                </div>
              </div>
              <button onClick={() => setPayingLoan(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {payError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{payError}</span>
              </div>
            )}

            {/* Fine Summary Box */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="block text-xs font-bold text-slate-900">{payingLoan.book.title}</span>
                <span className="text-[11px] text-slate-500">
                  Gecikilen Gün: <strong>{payingLoan.daysOverdue || 1} Gün</strong> (Günlük 10 TL)
                </span>
              </div>
              <div className="text-right">
                <span className="block text-[10px] text-slate-500 font-bold uppercase">Toplam Tutar</span>
                <span className="text-lg font-extrabold text-rose-700">{payingLoan.fineAmount} TL</span>
              </div>
            </div>

            {/* Card Form */}
            <form onSubmit={handlePosPayment} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Kart Üzerindeki İsim</label>
                <input
                  type="text"
                  required
                  placeholder="Ahmet Yılmaz"
                  value={cardForm.cardHolder}
                  onChange={(e) => setCardForm({ ...cardForm, cardHolder: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 font-semibold focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Kredi / Banka Kartı Numarası</label>
                <input
                  type="text"
                  required
                  placeholder="4543 •••• •••• 8912"
                  value={cardForm.cardNumber}
                  onChange={(e) => setCardForm({ ...cardForm, cardNumber: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 font-mono font-semibold focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Son Kullanma (AA/YY)</label>
                  <input
                    type="text"
                    required
                    placeholder="12/28"
                    value={cardForm.expiry}
                    onChange={(e) => setCardForm({ ...cardForm, expiry: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 font-mono font-semibold focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">CVC / CVV</label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    placeholder="382"
                    value={cardForm.cvc}
                    onChange={(e) => setCardForm({ ...cardForm, cvc: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 font-mono font-semibold focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={payLoading}
                  className="w-full py-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {payLoading ? (
                    'Sanal POS Bağlantısı Kuruluyor...'
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-emerald-400" />
                      <span>{payingLoan.fineAmount} TL Öde & İadeyi Tamamla</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-center pt-1">
                <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-slate-500" /> Güvenli Ödeme Altyapısı 256-Bit SSL ile Korunmaktadır.
                </span>
              </div>
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
