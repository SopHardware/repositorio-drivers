'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, AlertCircle, Package } from 'lucide-react';
import { Button, Input, Card, Badge } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { getDriver, updateDriver, deleteDriver } from '@/lib/api';

const HARDWARE_TYPES = ['IMPRESORA', 'ESCANER', 'TARJETA_RED', 'USB', 'DISCO_DURO', 'OPTICO', 'OTRO'];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function EditDriverPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const driverId = parseInt(params.id as string, 10);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    driverName: '', brand: '', model: '', version: '', hardwareType: 'IMPRESORA',
  });

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user && driverId) loadDriver();
  }, [user, driverId]);

  const loadDriver = async () => {
    try {
      const driver = await getDriver(driverId);
      setFormData({
        driverName: driver.driverName,
        brand: driver.brand,
        model: driver.model,
        version: driver.version,
        hardwareType: driver.hardwareType,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar driver');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      await updateDriver(driverId, formData);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este driver? Esta acción no se puede deshacer.')) return;
    try {
      await deleteDriver(driverId);
      router.push('/');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  if (authLoading || loading) return <div className="min-h-screen bg-app-bg flex items-center justify-center">Cargando...</div>;

  return (
    <div className="min-h-screen bg-app-bg">
      <header className="bg-card-bg border-b border-border-soft">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-text-muted hover:text-brand-red">
            <ArrowLeft className="w-4 h-4" /> Volver
          </Link>
          <span className="text-xl font-black text-text-main">Editar Driver</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600"><AlertCircle className="w-5 h-5" />{error}</div>}
        
        <Card>
          <div className="flex items-center gap-4 mb-6 p-4 bg-app-bg rounded-xl">
            <Package className="w-8 h-8 text-brand-red" />
            <div>
              <Badge>ID: {driverId}</Badge>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Nombre del Driver" value={formData.driverName} onChange={(e) => setFormData({...formData, driverName: e.target.value})} required />
              <div>
                <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Tipo de Hardware</label>
                <select value={formData.hardwareType} onChange={(e) => setFormData({...formData, hardwareType: e.target.value})} className="input-field">
                  {HARDWARE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Input label="Marca" value={formData.brand} onChange={(e) => setFormData({...formData, brand: e.target.value})} required />
              <Input label="Modelo" value={formData.model} onChange={(e) => setFormData({...formData, model: e.target.value})} required />
              <Input label="Versión" value={formData.version} onChange={(e) => setFormData({...formData, version: e.target.value})} required />
            </div>

            <div className="flex justify-between pt-4">
              <button type="button" onClick={handleDelete} className="text-red-600 hover:text-red-700 font-medium">Eliminar Driver</button>
              <div className="flex gap-4">
                <Link href="/" className="btn-secondary">Cancelar</Link>
                <Button type="submit" disabled={saving} className="flex items-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}