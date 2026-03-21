import { google, drive_v3 } from 'googleapis';
import { IStorage, UploadResult, DownloadResult, FileMetadata } from '../interfaces/IStorage.js';
import * as fs from 'fs';
import * as path from 'path';

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '';

export class GoogleDriveStorage implements IStorage {
  private static instance: GoogleDriveStorage;
  private drive: drive_v3.Drive;
  private folderId: string;

  private constructor() {
    const credentialsPath = process.env.GOOGLE_DRIVE_CREDENTIALS_PATH || './config/google-drive-credentials.json';
    
    let credentials: any;
    try {
      credentials = JSON.parse(fs.readFileSync(path.resolve(credentialsPath), 'utf-8'));
    } catch {
      console.warn('Google Drive credentials not found, using mock mode');
      credentials = null;
    }

    this.folderId = FOLDER_ID;

    if (credentials) {
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive'],
      });
      this.drive = google.drive({ version: 'v3', auth });
    } else {
      this.drive = null as any;
    }
  }

  static getInstance(): GoogleDriveStorage {
    if (!GoogleDriveStorage.instance) {
      GoogleDriveStorage.instance = new GoogleDriveStorage();
    }
    return GoogleDriveStorage.instance;
  }

  async upload(
    fileName: string,
    mimeType: string,
    stream: ReadableStream<Uint8Array>,
    size: number
  ): Promise<UploadResult> {
    if (!this.drive) {
      return this.mockUpload(fileName, mimeType, size);
    }

    const chunks: Buffer[] = [];
    const reader = stream.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
    }

    const buffer = Buffer.concat(chunks);
    const tempPath = path.join('/tmp', fileName);
    fs.writeFileSync(tempPath, buffer);

    try {
      const response = await this.drive.files.create({
        requestBody: {
          name: fileName,
          parents: [this.folderId],
        },
        media: {
          mimeType,
          body: fs.createReadStream(tempPath),
        },
        fields: 'id, name, mimeType, size, createdTime',
      });

      fs.unlinkSync(tempPath);

      return {
        fileId: response.data.id!,
        fileName: response.data.name!,
        mimeType: response.data.mimeType!,
        size: parseInt(response.data.size || '0', 10),
      };
    } catch (error) {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      throw error;
    }
  }

  private async mockUpload(fileName: string, mimeType: string, size: number): Promise<UploadResult> {
    const mockFileId = `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    console.log(`[MOCK] Uploading ${fileName} (${size} bytes) to Google Drive`);
    return {
      fileId: mockFileId,
      fileName,
      mimeType,
      size,
    };
  }

  async download(fileId: string): Promise<DownloadResult> {
    if (!this.drive) {
      return this.mockDownload(fileId);
    }

    const metadata = await this.drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size, createdTime',
    });

    const response = await this.drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    const self = this;
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        response.data.on('data', (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk));
        });
        response.data.on('end', () => {
          controller.close();
        });
        response.data.on('error', (err: Error) => {
          controller.error(err);
        });
      },
    });

    return {
      stream,
      metadata: {
        fileId: metadata.data.id!,
        fileName: metadata.data.name!,
        mimeType: metadata.data.mimeType!,
        size: parseInt(metadata.data.size || '0', 10),
        createdAt: new Date(metadata.data.createdTime!),
      },
    };
  }

  private async mockDownload(fileId: string): Promise<DownloadResult> {
    console.log(`[MOCK] Downloading file ${fileId} from Google Drive`);
    const encoder = new TextEncoder();
    const mockContent = `Mock file content for ${fileId}`;
    
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(mockContent));
        controller.close();
      },
    });

    return {
      stream,
      metadata: {
        fileId,
        fileName: `mock-file-${fileId}.bin`,
        mimeType: 'application/octet-stream',
        size: mockContent.length,
        createdAt: new Date(),
      },
    };
  }

  async delete(fileId: string): Promise<void> {
    if (!this.drive) {
      console.log(`[MOCK] Deleting file ${fileId} from Google Drive`);
      return;
    }

    await this.drive.files.delete({ fileId });
  }

  async getMetadata(fileId: string): Promise<FileMetadata> {
    if (!this.drive) {
      return {
        fileId,
        fileName: `mock-file-${fileId}.bin`,
        mimeType: 'application/octet-stream',
        size: 1024,
        createdAt: new Date(),
      };
    }

    const response = await this.drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size, createdTime',
    });

    return {
      fileId: response.data.id!,
      fileName: response.data.name!,
      mimeType: response.data.mimeType!,
      size: parseInt(response.data.size || '0', 10),
      createdAt: new Date(response.data.createdTime!),
    };
  }
}

export const googleDriveStorage = GoogleDriveStorage.getInstance();
