import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'Boxito - Admin Portal',
  description: 'Panel de administración de drivers',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}