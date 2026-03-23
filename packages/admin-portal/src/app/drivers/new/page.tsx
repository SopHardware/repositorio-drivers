'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, Loader2, AlertCircle } from 'lucide-react';
import { Button, Input, Card } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { uploadDriverFile, createDriver } from '@/lib/api';

const HARDWARE_TYPES = ['IMPRESORA', 'ESCANER', 'TARJETA_RED', 'USB', 'DISCO_DURO', 'OPTICO', 'OTRO'];

export default function NewDriverPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    driverName: '', brand: '', model: '', version: '', hardwareType: 'IMPRESORA', fileExtension: '', fileSize: 0, driveFileId: '',
  });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      setFormData({ ...formData, fileExtension: ext, fileSize: f.size, driverName: f.name.replace(/\.[^/.]+$/, '') });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError('Selecciona un archivo'); return; }
    setError(''); setLoading(true);

    try {
      setUploading(true);
      const uploadResult = await uploadDriverFile(file);
      
      const driverData = {
        ...formData,
        driveFileId: uploadResult.data.driveFileId,
        fileSize: uploadResult.data.fileSize || file.size,
        fileExtension: uploadResult.data.fileName.split('.').pop() || formData.fileExtension,
      };

      await createDriver(driverData);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear driver');
    } finally {
      setLoading(false); setUploading(false);
    }
  };

  if (authLoading) return <div className="min-h-screen bg-app-bg flex items-center justify-center">Cargando...</div>;

  return (
    <div className="min-h-screen bg-app-bg">
      <header className="bg-card-bg border-b border-border-soft">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-text-muted hover:text-brand-red">
            <ArrowLeft className="w-4 h-4" /> Volver
          </Link>
          <span className="text-xl font-black text-text-main">Nuevo Driver</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600"><AlertCircle className="w-5 h-5" />{error}</div>}
        
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Archivo del Driver</label>
              <div className="border-2 border-dashed border-border-soft rounded-xl p-8 text-center hover:border-brand-red transition-colors">
                <input type="file" onChange={handleFileChange} accept=".exe,.zip,.rar,.7z,.msi,.dmg,.pkg,.deb,.rpm" className="hidden" id="file-input" />
                <label htmlFor="file-input" className="cursor-pointer">
                  {file ? (
                    <div className="flex items-center justify-center gap-3">
                      <Upload className="w-8 h-8 text-brand-red" />
                      <div className="text-left">
                        <p className="font-medium text-text-main">{file.name}</p>
                        <p className="text-sm text-text-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-10 h-10 text-text-muted mx-auto mb-2" />
                      <p className="text-text-muted">Selecciona un archivo</p>
                      <p className="text-xs text-text-muted mt-1">.exe, .zip, .rar, .7z, .msi, .dmg, .pkg, .deb, .rpm</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

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
              <Input label="Marca" value={formData.brand} onChange={(e) => setFormData({...formData, brand: e.target.value})} required placeholder="HP, Canon, Epson..." />
              <Input label="Modelo" value={formData.model} onChange={(e) => setFormData({...formData, model: e.target.value})} required placeholder="LaserJet P1102" />
              <Input label="Versión" value={formData.version} onChange={(e) => setFormData({...formData, version: e.target.value})} required placeholder="1.0.0" />
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Link href="/" className="btn-secondary">Cancelar</Link>
              <Button type="submit" disabled={loading || uploading} className="flex items-center gap-2">
                {(loading || uploading) && <Loader2 className="w-4 h-4 animate-spin" />}
                {uploading ? 'Subiendo...' : loading ? 'Guardando...' : 'Crear Driver'}
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}