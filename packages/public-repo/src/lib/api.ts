const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const DEFAULT_TIMEOUT = 10000;
const MAX_RETRIES = 3;
const BASE_DELAY = 1000;

const CACHE_STRATEGIES = {
  SHORT: { revalidate: 60 },
  MEDIUM: { revalidate: 300 },
  LONG: { revalidate: 3600 },
  NONE: { cache: 'no-store' }
} as const;

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = DEFAULT_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = MAX_RETRIES,
  baseDelay = BASE_DELAY
): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options);

      if (!response.ok && response.status < 500) {
        return response;
      }

      if (!response.ok && attempt < retries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (error) {
      if (attempt === retries - 1) throw error;
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

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

  const response = await fetchWithRetry(
    url,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      next: CACHE_STRATEGIES.SHORT,
    },
    MAX_RETRIES,
    BASE_DELAY
  );

  const result = await handleResponse<ApiResponse<HardwareDriver[]>>(response);

  return {
    drivers: result.data || [],
    nextCursor: result.pagination?.nextCursor || null,
    hasMore: result.pagination?.hasMore || false,
  };
}

export async function getDriver(id: number): Promise<HardwareDriver> {
  const response = await fetchWithRetry(
    `${API_URL}/drivers/${id}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      next: CACHE_STRATEGIES.MEDIUM,
    },
    MAX_RETRIES,
    BASE_DELAY
  );

  const result = await handleResponse<ApiResponse<HardwareDriver>>(response);

  if (!result.data) {
    throw new Error('Driver no encontrado');
  }

  return result.data;
}

export function getDriverDownloadUrl(id: number): string {
  return `${API_URL}/drivers/${id}/download`;
}