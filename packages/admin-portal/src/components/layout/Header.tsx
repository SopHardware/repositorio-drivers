'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Package, Users, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="bg-card-bg border-b border-border-soft sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="bg-brand-red rounded-lg p-2">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <span className="text-2xl font-black text-text-main tracking-tight">BOXITO</span>
          </Link>

          <nav className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 text-text-main font-medium hover:text-brand-red transition-colors">
              <Package className="w-4 h-4" />
              Drivers
            </Link>
            {user?.role === 'ADMIN_SISTEMAS' && (
              <Link href="/users" className="flex items-center gap-2 text-text-main font-medium hover:text-brand-red transition-colors">
                <Users className="w-4 h-4" />
                Usuarios
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-4">
            <span className="text-sm text-text-muted">{user?.username}</span>
            <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-text-muted hover:text-brand-red transition-colors">
              <LogOut className="w-4 h-4" />
              Salir
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}