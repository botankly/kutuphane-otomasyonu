'use client';

import { useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import {
  Download,
  CreditCard,
  User,
  Mail,
  Calendar,
  Building2,
  CheckCircle2
} from 'lucide-react';

export default function MyCardPage() {
  const { user } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    if (!cardRef.current) return;
    setDownloading(true);

    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(cardRef.current, {
        scale: 3, // High DPI render quality
        useCORS: true,
        backgroundColor: null
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [120, 80] // Standard ID card dimension
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 120, 80);
      pdf.save(`Kutuphane_Dijital_Kimlik_Karti_${user?.fullName?.replace(/\s+/g, '_') || 'Uye'}.pdf`);
    } catch (err) {
      console.error('Kimlik kartı PDF indirilemedi:', err);
      alert('PDF oluşturulurken bir hata oluştu.');
    } finally {
      setDownloading(false);
    }
  };

  const memberId = user?.id ? `LIB-${user.id.substring(0, 8).toUpperCase()}` : 'LIB-2026-9812';
  const joinDate = '01.09.2025';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16 pt-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* HEADER HERO */}
        <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border border-slate-800">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950 text-blue-300 border border-blue-800 text-xs font-bold uppercase tracking-wider">
              <CreditCard className="w-3.5 h-3.5 text-blue-400" /> Dijital Kütüphane Üye Kartı
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Kurumsal Kütüphane Kimlik Kartı
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm">
              Turnike geçişlerinde, ödünç alma masalarında ve salon girişlerinde geçerli resmi dijital kütüphane kartınız.
            </p>
          </div>

          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2 flex-shrink-0 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {downloading ? 'PDF Oluşturuluyor...' : 'PDF / Kimlik Kartı İndir'}
          </button>
        </div>

        {/* CARD PREVIEW CONTAINER */}
        <div className="flex flex-col items-center justify-center space-y-6">
          {/* THE PHYSICAL CARD ELEMENT TO CAPTURE */}
          <div
            ref={cardRef}
            className="w-[500px] h-[310px] rounded-2xl bg-slate-900 text-white p-6 shadow-xl border border-slate-800 relative overflow-hidden flex flex-col justify-between"
            style={{ width: '500px', height: '310px' }} // Fixed dimensions for crisp html2canvas export
          >
            {/* BACKGROUND ACCENTS */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -z-0" />

            {/* CARD TOP BAR */}
            <div className="flex items-center justify-between z-10 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs tracking-wider text-slate-100 uppercase">
                    ÜNİVERSİTE KÜTÜPHANESİ
                  </h3>
                  <span className="text-[9px] text-blue-400 font-bold tracking-widest uppercase block">
                    DİJİTAL ÜYE KİMLİK KARTI
                  </span>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-md bg-blue-950 text-blue-300 border border-blue-800 font-bold text-[10px] uppercase">
                {user?.role || 'MEMBER'}
              </span>
            </div>

            {/* CARD BODY CONTENT */}
            <div className="flex items-center justify-between gap-4 z-10 my-auto">
              {/* AVATAR / PROFILE PHOTO */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 overflow-hidden shadow-inner flex-shrink-0">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-blue-400/80" />
                  )}
                </div>

                {/* MEMBER DETAILS */}
                <div className="space-y-1">
                  <h2 className="text-lg font-extrabold text-white tracking-tight leading-snug">
                    {user?.fullName || user?.email || 'Kayıtlı Üye'}
                  </h2>
                  <p className="text-[11px] text-slate-300 font-medium flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" /> {user?.email || '-'}
                  </p>
                  {user?.department && (
                    <p className="text-[10px] text-slate-300 font-semibold truncate max-w-[200px]">
                      {user.department}
                    </p>
                  )}
                  <p className="text-[10px] text-blue-300 font-mono font-bold pt-0.5">
                    Üye No: {memberId}
                  </p>
                </div>
              </div>

              {/* DYNAMIC QR CODE */}
              <div className="p-2 rounded-xl bg-white shadow-md flex flex-col items-center justify-center flex-shrink-0">
                <QRCodeSVG value={memberId} size={64} level="H" />
                <span className="text-[8px] font-bold text-slate-900 font-mono pt-1">GEÇİŞ KODU</span>
              </div>
            </div>

            {/* CARD FOOTER */}
            <div className="flex items-center justify-between z-10 border-t border-slate-800 pt-2.5 text-[9px] text-slate-400">
              <div className="flex items-center gap-1.5 font-medium">
                <Calendar className="w-3 h-3 text-blue-400" /> Katılım: {joinDate}
              </div>
              <div className="flex items-center gap-1 font-bold text-blue-400">
                <CheckCircle2 className="w-3 h-3" /> RESMİ DİJİTAL ONAYLI KART
              </div>
            </div>
          </div>

          <div className="text-center space-y-1">
            <span className="text-xs font-bold text-slate-500">
              * Bu dijital kimlik kartı sistem tarafından dinamik doğrulanmaktadır.
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
