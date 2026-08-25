import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import Navbar from '@/components/Navbar';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
};

export const metadata: Metadata = {
  title: 'Üniversite Kütüphane Bilgi Sistemi - Smart Library',
  description: 'Modern, Hızlı ve Güvenli Kütüphane, Dijital Katalog ve Masa Rezervasyon Platformu',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Ünv. Kütüphane'
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="h-full">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased">
        <ThemeProvider>
          <AuthProvider>
            <Navbar />
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
            <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-12 py-8 shadow-sm">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    © 2026 Üniversite Kütüphane Bilgi Sistemi. Tüm hakları saklıdır.
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Kütüphane ve Dokümantasyon Daire Başkanlığı • Kurumsal Otomasyon
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                    v2.4 Online
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-950 text-blue-300 border border-blue-800">
                    REST API Active
                  </span>
                </div>
              </div>
            </footer>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
