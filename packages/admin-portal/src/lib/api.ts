import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import axiosRetry from 'axios-retry';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const PUBLIC_REPO_URL = process.env.NEXT_PUBLIC_PUBLIC_REPO_URL || 'http://localhost:3000';

const DEFAULT_TIMEOUT = 10000;

const api = axios.create({
  baseURL: API_URL,
  timeout: DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosRetry(api, {
  retries: 3,
  retryDelay: (retryCount) => 1000 * Math.pow(2, retryCount),
  retryCondition: (error: AxiosError) => {
    return error.response === undefined || (error.response.status! >= 500 && error.response.status! < 600);
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = document.cookie.match(/accessToken=([^;]+)/)?.[1];
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

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

function handleError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as { error?: { message?: string }; message?: string };
    return new Error(responseData?.error?.message || responseData?.message || 'Error en la petición');
  }
  return new Error('Error desconocido');
}

export async function getDrivers(params: { search?: string; hardwareType?: string; cursor?: string; limit?: number }) {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set('search', params.search);
  if (params.hardwareType) searchParams.set('hardwareType', params.hardwareType);
  if (params.cursor) searchParams.set('cursor', params.cursor);
  if (params.limit) searchParams.set('limit', params.limit.toString());

  try {
    const response = await api.get(`/drivers${searchParams.toString() ? `?${searchParams}` : ''}`);
    return response.data;
  } catch (error) {
    throw handleError(error);
  }
}

export async function getDriver(id: number) {
  try {
    const response = await api.get(`/drivers/${id}`);
    return response.data.data;
  } catch (error) {
    throw handleError(error);
  }
}

export async function createDriver(data: Partial<HardwareDriver>) {
  try {
    const response = await api.post('/drivers', data);
    return response.data.data;
  } catch (error) {
    throw handleError(error);
  }
}

export async function updateDriver(id: number, data: Partial<HardwareDriver>) {
  try {
    const response = await api.put(`/drivers/${id}`, data);
    return response.data.data;
  } catch (error) {
    throw handleError(error);
  }
}

export async function deleteDriver(id: number) {
  try {
    await api.delete(`/drivers/${id}`);
  } catch (error) {
    throw handleError(error);
  }
}

export async function uploadDriverFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await api.post('/drivers/upload', formData);
    return response.data;
  } catch (error) {
    throw handleError(error);
  }
}

export async function getUsers() {
  try {
    const response = await api.get('/users');
    return response.data.data;
  } catch (error) {
    throw handleError(error);
  }
}

export async function createUser(data: { username: string; password: string; role: string }) {
  try {
    const response = await api.post('/users', data);
    return response.data.data;
  } catch (error) {
    throw handleError(error);
  }
}

export async function updateUserPassword(id: string, currentPassword: string, newPassword: string) {
  try {
    await api.put(`/users/${id}/password`, { currentPassword, newPassword });
  } catch (error) {
    throw handleError(error);
  }
}

export async function deleteUser(id: string) {
  try {
    await api.delete(`/users/${id}`);
  } catch (error) {
    throw handleError(error);
  }
}

export function getDriverDownloadUrl(id: number): string {
  return `${API_URL}/drivers/${id}/download`;
}

export function getPublicRepoUrl(): string {
  return PUBLIC_REPO_URL;
}
