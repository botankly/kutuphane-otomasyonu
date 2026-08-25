'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  ExternalLink,
  FileText,
  AlertCircle,
  Globe,
  Monitor
} from 'lucide-react';

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  author?: string;
  pdfUrl?: string | null;
}

export default function PdfViewerModal({
  isOpen,
  onClose,
  title,
  author,
  pdfUrl
}: PdfViewerModalProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [useGoogleDocs, setUseGoogleDocs] = useState<boolean>(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validPdfUrl = pdfUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
  
  // Google Docs viewer fallback URL for seamless cross-origin preview without CORS errors
  const googleDocsViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(validPdfUrl)}&embedded=true`;
  
  const currentIframeSrc = useGoogleDocs ? googleDocsViewerUrl : validPdfUrl;

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 75));

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col p-2 sm:p-4 text-white animate-fade-in">
      {/* TOP CONTROL BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-xl mb-3">
        {/* Book Title & Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight line-clamp-1">
              📄 E-Kitap Oku: {title}
            </h2>
            {author && (
              <span className="text-xs text-slate-400 font-medium block">
                Yazar: {author} • Kamuya Açık Tam Metin Dijital Nüsha
              </span>
            )}
          </div>
        </div>

        {/* Toolbar Controls (Viewer Mode, Zoom, Fullscreen, External, Close) */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher: Google Docs vs Direct PDF */}
          <div className="bg-slate-800 p-1 rounded-xl border border-slate-700 flex items-center gap-1">
            <button
              onClick={() => setUseGoogleDocs(true)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                useGoogleDocs
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Google Docs Önizleyici (CORS Bypass)"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Google Docs Mode</span>
            </button>

            <button
              onClick={() => setUseGoogleDocs(false)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                !useGoogleDocs
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Doğrudan PDF Görünümü (Native Browser)"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Doğrudan PDF</span>
            </button>
          </div>

          <div className="w-px h-6 bg-slate-800 mx-1 hidden sm:block"></div>

          {/* Zoom Out */}
          <button
            onClick={handleZoomOut}
            disabled={zoomLevel <= 75}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-40 transition-all"
            title="Uzaklaştır (%-25)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Zoom Badge */}
          <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-blue-400 min-w-[50px] text-center">
            %{zoomLevel}
          </span>

          {/* Zoom In */}
          <button
            onClick={handleZoomIn}
            disabled={zoomLevel >= 200}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-40 transition-all"
            title="Yakınlaştır (%+25)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-slate-800 mx-1 hidden sm:block"></div>

          {/* Open in New Tab / Download */}
          <a
            href={validPdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all"
            title="Harici Sekmede Aç / İndir"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">İndir / Sekmede Aç</span>
          </a>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all hidden sm:flex"
            title={isFullscreen ? 'Pencereye Dön' : 'Tam Ekran Yap'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close Modal Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 transition-all ml-1"
            title="Kapat (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* PDF VIEWER CONTAINER */}
      <div className="flex-1 w-full bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden relative shadow-2xl flex flex-col items-center justify-center">
        <div
          className="w-full h-full transition-transform duration-200 origin-top"
          style={{ transform: `scale(${zoomLevel / 100})` }}
        >
          <iframe
            key={currentIframeSrc}
            src={currentIframeSrc}
            className="w-full h-full bg-white rounded-xl border-0"
            title={title}
          />
        </div>

        {/* FALLBACK DIRECT LINK */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-center gap-2 shadow-lg z-10">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <span>Önizleyici yüklenmiyorsa:</span>
          <a
            href={validPdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 font-bold hover:underline"
          >
            Doğrudan PDF Belgesini Aç ↗
          </a>
        </div>
      </div>
    </div>
  );
}
