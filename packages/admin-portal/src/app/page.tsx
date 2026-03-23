'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Package, Plus, Search, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { Button, Card, Input, Badge } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { getDrivers, deleteDriver, HardwareDriver } from '@/lib/api';
import { getPublicRepoUrl } from '@/lib/api';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [drivers, setDrivers] = useState<HardwareDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) loadDrivers();
  }, [user]);

  const loadDrivers = async () => {
    setLoading(true);
    try {
      const result = await getDrivers({ search: search || undefined, limit: 50 });
      setDrivers(result.drivers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar drivers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este driver?')) return;
    try {
      await deleteDriver(id);
      setDrivers(drivers.filter(d => d.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  if (authLoading) return <div className="min-h-screen bg-app-bg flex items-center justify-center">Cargando...</div>;

  return (
    <div className="min-h-screen bg-app-bg">
      <header className="bg-card-bg border-b border-border-soft sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-brand-red rounded-lg p-2">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </div>
              <span className="text-2xl font-black text-text-main tracking-tight">BOXITO</span>
            </div>
            <nav className="flex items-center gap-6">
              <span className="flex items-center gap-2 text-brand-red font-medium">
                <Package className="w-4 h-4" /> Drivers
              </span>
              {user?.role === 'ADMIN_SISTEMAS' && (
                <Link href="/users" className="flex items-center gap-2 text-text-muted font-medium hover:text-brand-red">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  Usuarios
                </Link>
              )}
            </nav>
            <div className="flex items-center gap-4">
              <span className="text-sm text-text-muted">{user?.username}</span>
              <button onClick={() => { document.cookie = 'accessToken=;expires=Thu, 01 Jan 1970 00:00:00'; router.push('/login'); }} className="text-sm text-text-muted hover:text-brand-red">Salir</button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black text-text-main">Gestión de Drivers</h1>
          <div className="flex gap-3">
            <a href={getPublicRepoUrl()} target="_blank" rel="noopener noreferrer" className="btn-secondary flex items-center gap-2">
              <ExternalLink className="w-4 h-4" /> Ver Público
            </a>
            <Link href="/drivers/new" className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nuevo Driver
            </Link>
          </div>
        </div>

        <Card className="mb-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input placeholder="Buscar drivers..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && loadDrivers()} />
            </div>
            <Button onClick={loadDrivers} className="flex items-center gap-2">
              <Search className="w-4 h-4" /> Buscar
            </Button>
          </div>
        </Card>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg">{error}</div>}

        {loading ? (
          <div className="text-center py-12 text-text-muted">Cargando...</div>
        ) : drivers.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <p className="text-text-muted">No hay drivers registrados</p>
          </div>
        ) : (
          <div className="bg-card-bg rounded-2xl shadow-card overflow-hidden">
            <table className="w-full">
              <thead className="bg-app-bg border-b border-border-soft">
                <tr>
                  <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase">Nombre</th>
                  <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase">Marca/Modelo</th>
                  <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase">Tipo</th>
                  <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase">Versión</th>
                  <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase">Tamaño</th>
                  <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase">Fecha</th>
                  <th className="text-right p-4 text-xs font-semibold text-text-muted uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((driver) => (
                  <tr key={driver.id} className="border-b border-border-soft hover:bg-app-bg/50">
                    <td className="p-4 font-medium text-text-main">{driver.driverName}</td>
                    <td className="p-4 text-text-muted">{driver.brand} {driver.model}</td>
                    <td className="p-4"><Badge>{driver.hardwareType}</Badge></td>
                    <td className="p-4 text-text-muted">v{driver.version}</td>
                    <td className="p-4 text-text-muted">{formatSize(driver.fileSize)}</td>
                    <td className="p-4 text-text-muted">{formatDate(driver.createdAt)}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/drivers/${driver.id}/edit`} className="p-2 text-text-muted hover:text-brand-red transition-colors">
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button onClick={() => handleDelete(driver.id)} className="p-2 text-text-muted hover:text-red-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}