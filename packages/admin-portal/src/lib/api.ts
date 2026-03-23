const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const PUBLIC_REPO_URL = process.env.NEXT_PUBLIC_PUBLIC_REPO_URL || 'http://localhost:3000';

function getToken(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return document.cookie.match(/accessToken=([^;]+)/)?.[1];
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

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

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
    `/drivers${searchParams.toString() ? `?${searchParams}` : ''}`
  );
}

export async function getDriver(id: number) {
  return fetchApi<HardwareDriver>(`/drivers/${id}`);
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

  const response = await fetch(`${API_URL}/drivers/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) throw new Error('Error al subir archivo');
  return response.json();
}

export async function getUsers() {
  return fetchApi<User[]>('/users');
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