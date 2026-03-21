import type { Metadata } from 'next';
import { Header } from '@/components/layout';
import './globals.css';

export const metadata: Metadata = {
  title: 'Boxito - Repositorio de Drivers',
  description: 'Encuentra y descarga drivers para tu hardware de forma rápida y segura.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="bg-card-bg border-t border-border-soft py-6 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-sm text-text-muted">
              © 2026 Soporte Técnico e Infraestructura. Todos los derechos reservados.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
