import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import axiosRetry from 'axios-retry';
import Cookies from 'js-cookie';

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
    return error.response === undefined || (error.response.status >= 500 && error.response.status < 600);
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = Cookies.get('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
  config: AxiosRequestConfig;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject, config }) => {
    if (error) {
      reject(error);
    } else if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
      resolve(api.request(config));
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject, config: originalRequest });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = Cookies.get('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        Cookies.set('accessToken', accessToken, { expires: 1 });
        Cookies.set('refreshToken', newRefreshToken, { expires: 7 });

        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        return api.request(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null);
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        Cookies.remove('user');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
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
    const response = await api.post('/drivers/upload', formData, {
      headers: {
        'Content-Type': undefined,
      },
    });
    return response.data;
  } catch (error) {
    throw handleError(error);
  }
}

export async function calculateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(buffer);
  const binaryString = Array.from(uint8Array)
    .map(byte => String.fromCharCode(byte))
    .join('');
  
  // Use dynamic import for crypto-js to avoid SSR issues
  const cryptoJs = await import('crypto-js');
  return cryptoJs.SHA256(binaryString).toString();
}

export interface DuplicateCheckResult {
  exists: boolean;
  driver: {
    id: number;
    driverName: string;
    brand: string;
    model: string;
    version: string;
    hardwareType: string;
    fileHash: string;
    createdAt: string;
  } | null;
}

export async function checkDuplicateDriver(fileHash: string): Promise<DuplicateCheckResult> {
  try {
    const response = await api.post('/drivers/check-duplicate', { fileHash });
    return response.data.data;
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
