'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Calendar, HardDrive, Tag, AlertCircle, Loader2 } from 'lucide-react';
import { getDriver, getDriverDownloadUrl, HardwareDriver } from '@/lib/api';
import { Button, Badge, Card } from '@/components/ui';

interface DriverPageProps {
  params: {
    id: string;
  };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getHardwareTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    IMPRESORA: 'Impresora',
    ESCANER: 'Escáner',
    TARJETA_RED: 'Tarjeta de Red',
    USB: 'USB',
    DISCO_DURO: 'Disco Duro',
    OPTICO: 'Óptico',
    OTRO: 'Otro',
  };
  return labels[type] || type;
}

export default function DriverPage({ params }: DriverPageProps) {
  const id = parseInt(params.id, 10);
  const [driver, setDriver] = useState<HardwareDriver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isNaN(id)) {
      setError('ID inválido');
      setLoading(false);
      return;
    }

    getDriver(id)
      .then(setDriver)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const downloadFile = async () => {
    if (!driver) return;
    
    setIsDownloading(true);
    setDownloadError(null);
    abortRef.current = new AbortController();

    try {
      const downloadUrl = getDriverDownloadUrl(id);
      
      const response = await fetch(downloadUrl, {
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(errorData.error?.message || errorData.message || `Error ${response.status}`);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      const fileNameMatch = contentDisposition?.match(/filename="?(.+)"?/);
      const fileName = fileNameMatch ? fileNameMatch[1] : `${driver.driverName}.${driver.fileExtension}`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return;
      }
      setDownloadError((err as Error).message || 'Error al descargar el archivo');
    } finally {
      setIsDownloading(false);
      abortRef.current = null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-app-bg py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-text-muted hover:text-brand-red transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al buscador
          </Link>
          <Card className="p-8 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-red" />
          </Card>
        </div>
      </div>
    );
  }

  if (error || !driver) {
    return (
      <div className="min-h-screen bg-app-bg py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-text-muted hover:text-brand-red transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al buscador
          </Link>
          <Card className="p-8">
            <div className="flex items-center gap-2 text-brand-red">
              <AlertCircle className="w-5 h-5" />
              <span>Driver no encontrado</span>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-text-muted hover:text-brand-red transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al buscador
        </Link>

        <Card className="p-8">
          <div className="flex items-start justify-between mb-6">
            <Badge variant="primary" className="text-sm">
              {getHardwareTypeLabel(driver.hardwareType)}
            </Badge>
            <span className="text-sm text-text-muted">
              v{driver.version}
            </span>
          </div>

          <h1 className="text-3xl font-black text-text-main mb-2">
            {driver.driverName}
          </h1>

          <p className="text-xl text-text-muted mb-8">
            {driver.brand} {driver.model}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 p-4 bg-app-bg rounded-xl">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-brand-red" />
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide">Marca</p>
                <p className="font-semibold text-text-main">{driver.brand}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-brand-red" />
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide">Tamaño</p>
                <p className="font-semibold text-text-main">{formatFileSize(driver.fileSize)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-brand-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide">Formato</p>
                <p className="font-semibold text-text-main">{driver.fileExtension.toUpperCase()}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-red" />
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide">Agregado</p>
                <p className="font-semibold text-text-main">{formatDate(driver.createdAt)}</p>
              </div>
            </div>
          </div>

          <Button 
            onClick={downloadFile}
            disabled={isDownloading}
            className="w-full text-lg py-4 flex items-center justify-center gap-3"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Descargando...
              </>
            ) : (
              <>
                <Download className="w-6 h-6" />
                Descargar Driver
              </>
            )}
          </Button>

          {downloadError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{downloadError}</span>
            </div>
          )}

          <p className="text-center text-sm text-text-muted mt-4">
            Al descargar, aceptas utilizar este driver de acuerdo con las políticas de uso.
          </p>
        </Card>
      </div>
    </div>
  );
}