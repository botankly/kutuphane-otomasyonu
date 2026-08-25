'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/api';
import {
  BookOpen,
  LogOut,
  LayoutDashboard,
  Bookmark,
  GraduationCap,
  Bell,
  CheckCircle2,
  X,
  Building,
  CreditCard,
  Sun,
  Moon,
  User as UserIcon,
  ChevronDown,
  Menu,
  Home
} from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showBellDropdown, setShowBellDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000); // Polling every 15s
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowBellDropdown(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data?.data) {
        setNotifications(res.data.data.notifications || []);
        setUnreadCount(res.data.data.unreadCount || 0);
      }
    } catch (err) {
      console.log('Bildirimler çekilemedi:', err);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error('Bildirim güncellenemedi:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      fetchNotifications();
    } catch (err) {
      console.error('Bildirimler güncellenemedi:', err);
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-950 text-purple-300 border-purple-800';
      case 'LIBRARIAN':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      default:
        return 'bg-blue-950 text-blue-300 border-blue-800';
    }
  };

  const isStaff = user?.role === 'ADMIN' || user?.role === 'LIBRARIAN';

  return (
    <header className="sticky top-0 z-50 bg-slate-900 text-white border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* University Logo & Branding */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-base font-bold text-white tracking-tight block leading-snug">
              Üniversite Kütüphane Bilgi Sistemi
            </span>
            <span className="block text-[10px] text-slate-400 font-medium tracking-wider uppercase">
              Kütüphane & Dokümantasyon Daire Başkanlığı
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-5">
          <Link
            href="/"
            className="text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            Katalog Arama
          </Link>
          <Link
            href="/desk-reservation"
            className="text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center gap-1"
          >
            <Building className="w-3.5 h-3.5 text-blue-400" /> Masa Rezervasyonu
          </Link>
          {isAuthenticated && (
            <Link
              href="/my-card"
              className="text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center gap-1"
            >
              <CreditCard className="w-3.5 h-3.5 text-amber-400" /> Dijital Kimlik
            </Link>
          )}
          {isAuthenticated && (
            <Link
              href="/my-loans"
              className="text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center gap-1"
            >
              <Bookmark className="w-3.5 h-3.5 text-blue-400" /> Ödünç Takip
            </Link>
          )}
          {isAuthenticated && isStaff && (
            <Link
              href="/admin/dashboard"
              className="text-xs font-bold text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700"
            >
              <LayoutDashboard className="w-4 h-4 text-blue-400" /> Yönetim Paneli
            </Link>
          )}
        </nav>

        {/* User / Auth, Theme Switcher & Notification Bell */}
        <div className="flex items-center gap-3">
          {/* Dark / Light Mode Switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-slate-800 text-amber-400 hover:text-amber-300 hover:bg-slate-700 border border-slate-700 transition-all flex items-center gap-1 text-xs font-bold"
            title={theme === 'dark' ? 'Aydınlık Moda Geç (Light Mode)' : 'Gece Moduna Geç (Dark Mode)'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
            ) : (
              <Moon className="w-4 h-4 text-blue-300" />
            )}
          </button>

          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              {/* Notification Bell Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowBellDropdown(!showBellDropdown)}
                  className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 relative transition-all"
                  title="Bildirimler"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[9px] font-extrabold flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Dropdown Popover */}
                {showBellDropdown && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden text-xs text-slate-900">
                    <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-slate-900" />
                        <span className="font-bold text-slate-900 text-xs">Duyuru ve Bildirimler</span>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                            {unreadCount} Okunmamış
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-[10px] font-bold text-blue-700 hover:underline"
                        >
                          Tümünü Okundu İşaretle
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-slate-400">
                          Henüz bir bildiriminiz bulunmuyor.
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`p-3.5 space-y-1 transition-colors ${
                              !n.isRead ? 'bg-blue-50/40' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-bold text-slate-900">{n.title}</span>
                              {!n.isRead && (
                                <button
                                  onClick={() => handleMarkAsRead(n.id)}
                                  className="text-[10px] text-slate-400 hover:text-slate-900"
                                  title="Okundu İşaretle"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                                </button>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 leading-relaxed">{n.message}</p>
                            <span className="block text-[9px] text-slate-400">
                              {new Date(n.createdAt).toLocaleDateString('tr-TR')} {new Date(n.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Dropdown */}
              <div className="relative" ref={userDropdownRef}>
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all text-left group"
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.fullName}
                      className="w-7 h-7 rounded-lg object-cover border border-amber-400/60 shadow-sm"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                      {user.fullName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="hidden sm:block">
                    <span className="block text-xs font-bold text-white leading-tight group-hover:text-amber-300 transition-colors">
                      {user.fullName}
                    </span>
                    <span
                      className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded border ${getRoleBadge(
                        user.role
                      )}`}
                    >
                      {user.role}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform duration-200" />
                </button>

                {/* Dropdown Popover */}
                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl z-50 overflow-hidden text-xs text-white">
                    {/* Header Info */}
                    <div className="p-4 bg-slate-800/80 border-b border-slate-700/80 space-y-2">
                      <div className="flex items-center gap-3">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.fullName}
                            className="w-10 h-10 rounded-xl object-cover border border-amber-400/80"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-sm shadow-md">
                            {user.fullName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="overflow-hidden">
                          <h4 className="font-bold text-white text-sm truncate">{user.fullName}</h4>
                          <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                        </div>
                      </div>
                      <div className="pt-1">
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded border ${getRoleBadge(user.role)}`}>
                          {user.role === 'ADMIN' ? 'Sistem Yöneticisi' : user.role === 'LIBRARIAN' ? 'Kütüphane Görevlisi' : 'Üye / Öğrenci'}
                        </span>
                      </div>
                    </div>

                    {/* Nav Links */}
                    <div className="p-1.5 space-y-1">
                      <Link
                        href="/profile"
                        onClick={() => setShowUserDropdown(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:text-white hover:bg-slate-800 transition-colors font-medium"
                      >
                        <UserIcon className="w-4 h-4 text-blue-400" />
                        <span>Profilim / Hesap Ayarları</span>
                      </Link>

                      <Link
                        href="/my-loans"
                        onClick={() => setShowUserDropdown(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:text-white hover:bg-slate-800 transition-colors font-medium"
                      >
                        <Bookmark className="w-4 h-4 text-blue-400" />
                        <span>Ödünç Takibi</span>
                      </Link>

                      <Link
                        href="/my-card"
                        onClick={() => setShowUserDropdown(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:text-white hover:bg-slate-800 transition-colors font-medium"
                      >
                        <CreditCard className="w-4 h-4 text-amber-400" />
                        <span>Dijital Kimlik Kartım</span>
                      </Link>
                    </div>

                    {/* Logout Footer */}
                    <div className="p-1.5 border-t border-slate-800">
                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors font-bold text-left"
                      >
                        <LogOut className="w-4 h-4 text-rose-400" />
                        <span>Çıkış Yap</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
              >
                Giriş Yap
              </Link>
              <Link
                href="/register"
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
              >
                Üye Kaydı
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 md:hidden transition-all"
            title="Menüyü Aç/Kapat"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-amber-400" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* MOBILE HAMBURGER DRAWER */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 p-4 space-y-3 animate-in slide-in-from-top duration-200">
          <div className="space-y-1">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 text-slate-200 font-bold text-xs"
            >
              <BookOpen className="w-4 h-4 text-blue-400" /> Katalog Arama
            </Link>

            <Link
              href="/desk-reservation"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 text-slate-200 font-bold text-xs"
            >
              <Building className="w-4 h-4 text-amber-400" /> Masa & Salon Rezervasyonu
            </Link>

            {isAuthenticated && (
              <>
                <Link
                  href="/my-card"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 text-slate-200 font-bold text-xs"
                >
                  <CreditCard className="w-4 h-4 text-amber-400" /> Dijital Kimlik Kartım
                </Link>

                <Link
                  href="/my-loans"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 text-slate-200 font-bold text-xs"
                >
                  <Bookmark className="w-4 h-4 text-blue-400" /> Ödünç Kitap Takibi
                </Link>

                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 text-slate-200 font-bold text-xs"
                >
                  <UserIcon className="w-4 h-4 text-emerald-400" /> Profilim / Hesap Ayarları
                </Link>
              </>
            )}

            {isAuthenticated && isStaff && (
              <Link
                href="/admin/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-800 text-white font-extrabold text-xs border border-slate-700"
              >
                <LayoutDashboard className="w-4 h-4 text-purple-400" /> Yönetim Paneli
              </Link>
            )}
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 text-slate-300 flex items-center justify-around py-2.5 px-2 shadow-2xl">
        <Link
          href="/"
          className="flex flex-col items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-white"
        >
          <Home className="w-4 h-4 text-blue-400" />
          <span>Katalog</span>
        </Link>

        <Link
          href="/desk-reservation"
          className="flex flex-col items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-white"
        >
          <Building className="w-4 h-4 text-amber-400" />
          <span>Masa & Oda</span>
        </Link>

        {isAuthenticated ? (
          <Link
            href="/my-card"
            className="flex flex-col items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-white"
          >
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <span>Kimlik</span>
          </Link>
        ) : (
          <Link
            href="/login"
            className="flex flex-col items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-white"
          >
            <UserIcon className="w-4 h-4 text-blue-400" />
            <span>Giriş</span>
          </Link>
        )}

        {isAuthenticated && (
          <Link
            href="/profile"
            className="flex flex-col items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-white"
          >
            <UserIcon className="w-4 h-4 text-purple-400" />
            <span>Profilim</span>
          </Link>
        )}
      </div>
    </header>
  );
}
