'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  Lock,
  Bell,
  CheckCircle2,
  AlertCircle,
  Save,
  KeyRound,
  ShieldCheck,
  Camera,
  Sparkles
} from 'lucide-react';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&auto=format&fit=crop&q=80'
];

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

  // Form states for profile info
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);

  // Form states for password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI feedback states
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setDepartment(user.department || 'Bilgisayar Mühendisliği / 3. Sınıf');
      setAvatarUrl(user.avatarUrl || '');
      setEmailNotifications(user.emailNotifications !== undefined ? user.emailNotifications : true);
    }
  }, [user]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);

    try {
      const res = await api.put('/auth/profile', {
        fullName,
        phone,
        department,
        avatarUrl,
        emailNotifications
      });

      if (res.data?.data?.user) {
        updateUser(res.data.data.user);
        showToast('Profil bilgileriniz başarıyla güncellendi.', 'success');
      }
    } catch (err: any) {
      console.error('Profil güncellenemedi:', err);
      showToast(err.response?.data?.message || 'Profil güncellenirken bir hata oluştu.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      showToast('Lütfen mevcut şifrenizi giriniz.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Yeni şifreniz en az 6 karakter olmalıdır.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Yeni şifreler birbiriyle eşleşmiyor.', 'error');
      return;
    }

    setSavingPassword(true);

    try {
      await api.put('/auth/change-password', {
        currentPassword,
        newPassword
      });

      showToast('Şifreniz başarıyla değiştirildi.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Şifre değiştirilemedi:', err);
      showToast(err.response?.data?.message || 'Şifre değiştirilirken bir hata oluştu.', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16 pt-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* TOAST FEEDBACK FLOATING NOTIFICATION */}
        {toastMessage && (
          <div
            className={`fixed top-20 right-5 z-50 px-5 py-3.5 rounded-2xl shadow-2xl border flex items-center gap-3 transition-all animate-bounce ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950 text-emerald-200 border-emerald-800'
                : 'bg-rose-950 text-rose-200 border-rose-800'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            )}
            <span className="font-bold text-xs">{toastMessage.text}</span>
          </div>
        )}

        {/* HERO BANNER CARD */}
        <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -z-0" />
          
          <div className="flex items-center gap-5 z-10 w-full sm:w-auto">
            <div className="relative group">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={fullName}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-400/80 shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-2xl border-2 border-amber-400/80 shadow-md">
                  {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 p-1.5 rounded-lg bg-amber-400 text-slate-950 shadow-md">
                <Camera className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">{fullName || 'Kullanıcı'}</h1>
                <span className="px-2.5 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-extrabold uppercase">
                  {user?.role || 'MEMBER'}
                </span>
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> {email}
              </p>
              <p className="text-[11px] text-amber-300 font-medium flex items-center gap-1.5 pt-0.5">
                <GraduationCap className="w-3.5 h-3.5 text-amber-400" /> {department || 'Üye Öğrenci'}
              </p>
            </div>
          </div>

          <div className="z-10 flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 p-1.5 rounded-2xl w-full sm:w-auto justify-center">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'profile'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <User className="w-3.5 h-3.5" /> Kişisel Bilgiler
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'password'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Lock className="w-3.5 h-3.5" /> Şifre Değiştir
            </button>
          </div>
        </div>

        {/* TAB 1: KİŞİSEL BİLGİLER & PROFİL FOTOĞRAFI */}
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-6">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" /> Profil & Kişisel Bilgiler
                </h2>
                <p className="text-xs text-slate-500">
                  Adınız, telefon numaranız ve kütüphane iletişim tercihleriniz.
                </p>
              </div>
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>

            {/* AVATAR SELECTION GRID */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">Profil Fotoğrafı Seçimi</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {PRESET_AVATARS.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAvatarUrl(url)}
                    className={`relative rounded-2xl overflow-hidden border-2 transition-all h-20 ${
                      avatarUrl === url ? 'border-blue-600 scale-105 shadow-md' : 'border-slate-200 hover:border-slate-400 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                    {avatarUrl === url && (
                      <div className="absolute inset-0 bg-blue-600/30 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* CUSTOM AVATAR URL INPUT */}
              <div className="pt-2">
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Veya Özel Görsel / Unsplash URL Yapıştırın:
                </label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* INPUT FIELDS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Ad Soyad</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">E-Posta Adresi (Sabit)</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    disabled
                    value={email}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-medium text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Telefon Numarası</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0532 123 45 67"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Bölüm / Sınıf Bilgisi</label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Bilgisayar Mühendisliği / 3. Sınıf"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* NOTIFICATION PREFERENCES TOGGLE */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">E-Posta ile İade Hatırlatma Bildirimleri</h4>
                  <p className="text-[11px] text-slate-500">Kitap teslim tarihine 2 gün kala e-posta hatırlatması gönderilsin.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEmailNotifications(!emailNotifications)}
                className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                  emailNotifications ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                    emailNotifications ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingProfile ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: ŞİFRE DEĞİŞTİR */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-6">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-600" /> Şifre Değiştir & Güvenlik
                </h2>
                <p className="text-xs text-slate-500">
                  Hesap güvenliğiniz için şifrenizi düzenli aralıklarla yenileyin.
                </p>
              </div>
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>

            <div className="space-y-4 max-w-md">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Mevcut Şifreniz</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Yeni Şifreniz (En az 6 karakter)</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Yeni Şifre Tekrar</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingPassword}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                {savingPassword ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
