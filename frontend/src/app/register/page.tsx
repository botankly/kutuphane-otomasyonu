'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { GraduationCap, UserPlus, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await api.post('/auth/register', {
        fullName,
        email,
        password
      });

      if (response.data && response.data.data) {
        const { token, user } = response.data.data;
        login(token, user);
        router.push('/');
      }
    } catch (err: any) {
      console.error('Kayıt hatası:', err);
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
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Yeni Üye Kaydı</h1>
          <p className="text-xs text-slate-500">
            Üniversite Kütüphane Otomasyonuna kaydolarak kitap ödünç alabilir ve masa rezerve edebilirsiniz
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form with HTML Auto-fill Standards */}
        <form action="#" method="POST" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-xs font-bold text-slate-700 mb-1.5">
              Ad Soyad
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              placeholder="Ahmet Yılmaz"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white transition-all font-medium"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-bold text-slate-700 mb-1.5">
              E-Posta Adresi
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="ahmet@kutuphane.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white transition-all font-medium"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-bold text-slate-700 mb-1.5">
              Şifre (En az 6 karakter)
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white transition-all font-medium"
            />
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
                <UserPlus className="w-4 h-4 text-blue-300" />
                <span>Kayıt Ol ve Başla</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="text-center pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Zaten hesabınız var mı?{' '}
            <Link href="/login" className="font-bold text-slate-900 hover:underline">
              Giriş Yapın
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
