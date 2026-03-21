'use client';

import Link from 'next/link';
import { Download } from 'lucide-react';
import { Card, Badge, Button } from '../ui';
import type { HardwareDriver } from '@/lib/api';

interface DriverCardProps {
  driver: HardwareDriver;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

export function DriverCard({ driver }: DriverCardProps) {
  const downloadUrl = `${process.env.NEXT_PUBLIC_API_URL}/drivers/${driver.id}/download`;

  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-start justify-between mb-3">
        <Badge variant="primary">{getHardwareTypeLabel(driver.hardwareType)}</Badge>
        <span className="text-xs text-text-muted">v{driver.version}</span>
      </div>

      <h3 className="text-lg font-bold text-text-main mb-1 line-clamp-2">
        {driver.driverName}
      </h3>

      <p className="text-sm text-text-muted mb-1">
        {driver.brand} {driver.model}
      </p>

      <p className="text-xs text-text-muted mb-4">
        {formatFileSize(driver.fileSize)} • {driver.fileExtension.toUpperCase()}
      </p>

      <div className="mt-auto pt-4 border-t border-border-soft">
        <Link href={`/driver/${driver.id}`} className="block">
          <Button className="w-full flex items-center justify-center gap-2">
            <Download className="w-4 h-4" />
            Descargar
          </Button>
        </Link>
      </div>
    </Card>
  );
}
