const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const PUBLIC_REPO_URL = process.env.NEXT_PUBLIC_PUBLIC_REPO_URL || 'http://localhost:3000';

const DEFAULT_TIMEOUT = 10000;
const MAX_RETRIES = 3;
const BASE_DELAY = 1000;

const CACHE_STRATEGIES = {
  SHORT: { revalidate: 60 },
  MEDIUM: { revalidate: 300 },
  LONG: { revalidate: 3600 },
  NONE: { cache: 'no-store' }
} as const;

function getToken(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return document.cookie.match(/accessToken=([^;]+)/)?.[1];
}

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
  hardwareType: string;
  driveFileId: string;
  fileExtension: string;
  fileSize: number;
  uploadedById: string;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  role: string;
  createdAt: string;
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}, useCache = false): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const cacheOptions = useCache ? CACHE_STRATEGIES.MEDIUM : CACHE_STRATEGIES.NONE;

  const response = await fetchWithRetry(
    `${API_URL}${endpoint}`, 
    { ...options, headers, next: cacheOptions }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
    throw new Error(error.error?.message || error.message || 'Error en la petición');
  }

  if (response.status === 204) return {} as T;
  const data = await response.json();
  return data.data || data;
}

export async function getDrivers(params: { search?: string; hardwareType?: string; cursor?: string; limit?: number }) {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set('search', params.search);
  if (params.hardwareType) searchParams.set('hardwareType', params.hardwareType);
  if (params.cursor) searchParams.set('cursor', params.cursor);
  if (params.limit) searchParams.set('limit', params.limit.toString());
  return fetchApi<{ drivers: HardwareDriver[]; pagination: { nextCursor: string | null; hasMore: boolean } }>(
    `/drivers${searchParams.toString() ? `?${searchParams}` : ''}`,
    { method: 'GET' },
    true
  );
}

export async function getDriver(id: number) {
  return fetchApi<HardwareDriver>(`/drivers/${id}`, { method: 'GET' }, true);
}

export async function createDriver(data: Partial<HardwareDriver>) {
  return fetchApi<HardwareDriver>('/drivers', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateDriver(id: number, data: Partial<HardwareDriver>) {
  return fetchApi<HardwareDriver>(`/drivers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteDriver(id: number) {
  return fetchApi<void>(`/drivers/${id}`, { method: 'DELETE' });
}

export async function uploadDriverFile(file: File) {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetchWithRetry(
    `${API_URL}/drivers/upload`,
    {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    },
    MAX_RETRIES,
    BASE_DELAY
  );

  if (!response.ok) throw new Error('Error al subir archivo');
  return response.json();
}

export async function getUsers() {
  return fetchApi<User[]>('/users', { method: 'GET' }, false);
}

export async function createUser(data: { username: string; password: string; role: string }) {
  return fetchApi<User>('/users', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateUserPassword(id: string, currentPassword: string, newPassword: string) {
  return fetchApi<void>(`/users/${id}/password`, {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function deleteUser(id: string) {
  return fetchApi<void>(`/users/${id}`, { method: 'DELETE' });
}

export function getDriverDownloadUrl(id: number): string {
  return `${API_URL}/drivers/${id}/download`;
}

export function getPublicRepoUrl(): string {
  return PUBLIC_REPO_URL;
}