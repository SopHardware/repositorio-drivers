export interface FileMetadata {
  fileId: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}

export interface UploadResult {
  fileId: string;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface DownloadResult {
  stream: ReadableStream<Uint8Array>;
  metadata: FileMetadata;
}

export interface IStorage {
  upload(fileName: string, mimeType: string, buffer: Buffer, size: number): Promise<UploadResult>;
  download(fileId: string): Promise<DownloadResult>;
  delete(fileId: string): Promise<void>;
  getMetadata(fileId: string): Promise<FileMetadata>;
}

export interface IStorageFactory {
  getStorage(): IStorage;
}
