import axios, { AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const DEFAULT_TIMEOUT = 10000;

const api = axios.create({
  baseURL: API_URL,
  timeout: DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

function handleError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as { error?: { message?: string }; message?: string };
    return new Error(responseData?.error?.message || responseData?.message || 'Error en la petición');
  }
  return new Error('Error desconocido');
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
  const url = `/drivers${queryString ? `?${queryString}` : ''}`;

  try {
    const response = await api.get<ApiResponse<HardwareDriver[]>>(url);
    const result = response.data;

    return {
      drivers: result.data || [],
      nextCursor: result.pagination?.nextCursor || null,
      hasMore: result.pagination?.hasMore || false,
    };
  } catch (error) {
    throw handleError(error);
  }
}

export async function getDriver(id: number): Promise<HardwareDriver> {
  try {
    const response = await api.get<ApiResponse<HardwareDriver>>(`/drivers/${id}`);
    const result = response.data;

    if (!result.data) {
      throw new Error('Driver no encontrado');
    }

    return result.data;
  } catch (error) {
    throw handleError(error);
  }
}

export function getDriverDownloadUrl(id: number): string {
  return `${API_URL}/drivers/${id}/download`;
}
