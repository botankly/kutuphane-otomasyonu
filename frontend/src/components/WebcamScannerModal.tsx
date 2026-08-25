'use client';

import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, CheckCircle2 } from 'lucide-react';

interface WebcamScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedText: string) => void;
  title?: string;
  description?: string;
}

export default function WebcamScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  title = '📷 Kamera ile Barkod / QR Kod Tara',
  description = 'Kitabın üzerindeki barkodu veya mobil kimlik QR kodunu kameranıza yaklaştırın.'
}: WebcamScannerModalProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const elementId = 'html5qr-code-full-region';

  useEffect(() => {
    if (!isOpen) return;

    let isScanning = true;

    const startScanner = async () => {
      try {
        await new Promise((r) => setTimeout(r, 200));
        if (!document.getElementById(elementId)) return;

        const html5Qrcode = new Html5Qrcode(elementId);
        scannerRef.current = html5Qrcode;

        await html5Qrcode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          },
          (decodedText) => {
            if (isScanning) {
              isScanning = false;
              onScanSuccess(decodedText);
              stopScanner();
              onClose();
            }
          },
          () => {
            // Ignore scan failures per frame
          }
        );
      } catch (err) {
        console.error('Kamera başlatılamadı:', err);
      }
    };

    startScanner();

    return () => {
      isScanning = false;
      stopScanner();
    };
  }, [isOpen]);

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.log('Scanner durdurulurken uyarı:', err);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <div className="bg-white w-full max-w-md p-6 rounded-3xl border border-slate-200 shadow-2xl space-y-4 relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={() => {
            stopScanner();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[11px] font-bold border border-blue-200 uppercase tracking-wider">
            <Camera className="w-3.5 h-3.5 text-blue-600 animate-pulse" /> Canlı Kamera Taraması
          </div>
          <h3 className="text-lg font-extrabold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">{description}</p>
        </div>

        {/* Camera Container */}
        <div className="relative rounded-2xl overflow-hidden border-2 border-dashed border-blue-400 bg-slate-950 p-2 min-h-[280px] flex items-center justify-center">
          <div id={elementId} className="w-full h-full rounded-xl overflow-hidden" />
        </div>

        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-900 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span>Barkod veya QR tam hizalandığında otomatik algılanarak form doldurulacaktır.</span>
        </div>
      </div>
    </div>
  );
}
