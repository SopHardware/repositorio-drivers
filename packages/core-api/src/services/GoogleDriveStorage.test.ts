import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleDriveStorage } from './GoogleDriveStorage.js';

vi.mock('fs', () => ({
  readFileSync: vi.fn().mockReturnValue('{}'),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  existsSync: vi.fn().mockReturnValue(true),
}));

vi.mock('googleapis', () => {
  const mockDrive = {
    files: {
      create: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
    },
  };
  return {
    google: {
      drive: vi.fn(() => ({
        v3: mockDrive,
      })),
      auth: {
        GoogleAuth: vi.fn(),
      },
    },
  };
});

describe('GoogleDriveStorage', () => {
  let storage: GoogleDriveStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('GOOGLE_DRIVE_CREDENTIALS_PATH', './config/google-drive-credentials.json');
    vi.stubEnv('GOOGLE_DRIVE_FOLDER_ID', 'test-folder-id');
    storage = GoogleDriveStorage.getInstance();
  });

  it('should return singleton instance', () => {
    const instance1 = GoogleDriveStorage.getInstance();
    const instance2 = GoogleDriveStorage.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should upload file in mock mode when no credentials', async () => {
    const buffer = Buffer.from([1, 2, 3]);

    const result = await storage.upload('test.exe', 'application/octet-stream', buffer, 3);

    expect(result.fileId).toBeDefined();
    expect(result.fileName).toBe('test.exe');
    expect(result.mimeType).toBe('application/octet-stream');
    expect(result.size).toBe(3);
  });

  it('should download file in mock mode', async () => {
    const result = await storage.download('mock-file-id');

    expect(result.metadata.fileId).toBe('mock-file-id');
    expect(result.metadata.fileName).toContain('mock-file-id');
    expect(result.stream).toBeDefined();
  });

  it('should get metadata in mock mode', async () => {
    const metadata = await storage.getMetadata('mock-file-id');

    expect(metadata.fileId).toBe('mock-file-id');
    expect(metadata.fileName).toBeDefined();
    expect(metadata.size).toBeGreaterThanOrEqual(0);
  });

  it('should delete file in mock mode', async () => {
    await expect(storage.delete('mock-file-id')).resolves.not.toThrow();
  });
});
