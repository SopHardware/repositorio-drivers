import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, Calendar, HardDrive, Tag } from 'lucide-react';
import { getDriver, getDriverDownloadUrl } from '@/lib/api';
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

export default async function DriverPage({ params }: DriverPageProps) {
  const id = parseInt(params.id, 10);

  if (isNaN(id)) {
    notFound();
  }

  let driver;
  try {
    driver = await getDriver(id);
  } catch {
    notFound();
  }

  const downloadUrl = getDriverDownloadUrl(id);

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

          <a href={downloadUrl} download className="block">
            <Button className="w-full text-lg py-4 flex items-center justify-center gap-3">
              <Download className="w-6 h-6" />
              Descargar Driver
            </Button>
          </a>

          <p className="text-center text-sm text-text-muted mt-4">
            Al descargar, aceptas utilizar este driver de acuerdo con las políticas de uso.
          </p>
        </Card>
      </div>
    </div>
  );
}
