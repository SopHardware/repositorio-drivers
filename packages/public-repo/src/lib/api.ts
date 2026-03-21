const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface HardwareDriver {
  id: number;
  driverName: string;
  brand: string;
  model: string;
  version: string;
  hardwareType: HardwareType;
  driveFileId: string;
  fileExtension: string;
  fileSize: number;
  uploadedById: string;
  createdAt: string;
  updatedAt: string;
}

export type HardwareType =
  | 'IMPRESORA'
  | 'ESCANER'
  | 'TARJETA_RED'
  | 'USB'
  | 'DISCO_DURO'
  | 'OPTICO'
  | 'OTRO';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: {
    nextCursor: string | null;
    hasMore: boolean;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface DriverListResponse {
  drivers: HardwareDriver[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
    throw new Error(error.error?.message || error.message || 'Error en la petición');
  }
  return response.json();
}

export async function getDrivers(params: {
  search?: string;
  hardwareType?: string;
  cursor?: string;
  limit?: number;
}): Promise<{ drivers: HardwareDriver[]; nextCursor: string | null; hasMore: boolean }> {
  const searchParams = new URLSearchParams();
  
  if (params.search) searchParams.set('search', params.search);
  if (params.hardwareType) searchParams.set('hardwareType', params.hardwareType);
  if (params.cursor) searchParams.set('cursor', params.cursor);
  if (params.limit) searchParams.set('limit', params.limit.toString());

  const queryString = searchParams.toString();
  const url = `${API_URL}/drivers${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    next: { revalidate: 60 },
  });

  const result = await handleResponse<ApiResponse<HardwareDriver[]>>(response);

  return {
    drivers: result.data || [],
    nextCursor: result.pagination?.nextCursor || null,
    hasMore: result.pagination?.hasMore || false,
  };
}

export async function getDriver(id: number): Promise<HardwareDriver> {
  const response = await fetch(`${API_URL}/drivers/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    next: { revalidate: 60 },
  });

  const result = await handleResponse<ApiResponse<HardwareDriver>>(response);

  if (!result.data) {
    throw new Error('Driver no encontrado');
  }

  return result.data;
}

export function getDriverDownloadUrl(id: number): string {
  return `${API_URL}/drivers/${id}/download`;
}
