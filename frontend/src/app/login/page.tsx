'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { GraduationCap, LogIn, AlertCircle, CheckSquare, Square } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Check if email was saved via Remember Me
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await api.post('/auth/login', {
        email,
        password
      });

      if (response.data && response.data.data) {
        const { token, user } = response.data.data;

        // Remember Me handler
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }

        login(token, user);

        if (user.role === 'ADMIN' || user.role === 'LIBRARIAN') {
          router.push('/dashboard');
        } else {
          router.push('/');
        }
      }
    } catch (err: any) {
      console.error('Giriş hatası:', err);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Sunucu ile iletişim kurulurken bir hata oluştu.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white mx-auto shadow-md">
            <GraduationCap className="w-6 h-6 text-blue-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Kullanıcı Girişi</h1>
          <p className="text-xs text-slate-500">
            Üniversite Kütüphane Bilgi Sistemi hesabınızla giriş yapın
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form with HTML Auto-fill & Standard Submit */}
        <form action="#" method="POST" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-xs font-bold text-slate-700 mb-1.5">
              E-Posta Adresi / Kullanıcı Adı
            </label>
            <input
              id="username"
              name="username"
              type="email"
              autoComplete="username"
              required
              placeholder="ornek@kutuphane.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white transition-all font-medium"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-xs font-bold text-slate-700">
                Şifre
              </label>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white transition-all font-medium"
            />
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-slate-900 accent-slate-900 cursor-pointer"
              />
              <span>Beni Hatırla (Şifreyi / Oturumu Sakla)</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4 text-blue-300" />
                <span>Sisteme Giriş Yap</span>
              </>
            )}
          </button>
        </form>

        {/* Test Accounts Box */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
          <span className="font-bold text-slate-800 block">Hızlı Test Hesapları:</span>
          <div>Admin: <code>admin@kutuphane.com</code> / <code>admin123</code></div>
          <div>Öğrenci 1: <code>havin@kutuphane.com</code> / <code>password123</code></div>
          <div>Öğrenci 2: <code>edanur@kutuphane.com</code> / <code>password123</code></div>
          <div>Öğrenci 3: <code>botan@kutuphane.com</code> / <code>password123</code></div>
        </div>

        {/* Footer Link */}
        <div className="text-center pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Hesabınız yok mu?{' '}
            <Link href="/register" className="font-bold text-slate-900 hover:underline">
              Üye Kaydı Oluşturun
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
