# Skill: boxito-storage

## Descripción

Este skill proporciona una guía completa para implementar la capa de almacenamiento del proyecto Boxito usando Google Drive API v3. El sistema utiliza el patrón Factory para permitir abstracción del proveedor de almacenamiento.

## Pre-requisitos

- Node.js 18+
- Cuenta de Google Cloud con Google Drive API habilitada
- Credenciales de service account
- Conocimiento de TypeScript

## Técnicas de Programación

### 1. Google Drive API v3

**Configuración de cliente:**
```typescript
import { google, drive_v3 } from 'googleapis';

export class GoogleDriveStorage {
  private drive: drive_v3.Drive;
  private folderId: string;

  constructor() {
    const credentialsPath = process.env.GOOGLE_DRIVE_CREDENTIALS_PATH || './config/google-drive-credentials.json';
    
    // Cargar credenciales desde archivo
    const credentials = JSON.parse(fs.readFileSync(path.resolve(credentialsPath), 'utf-8'));
    
    // Crear autenticador OAuth2
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive']
    });
    
    // Crear cliente de Drive API
    this.drive = google.drive({ version: 'v3', auth });
    this.folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '';
  }
}
```

**Subir archivo:**
```typescript
async upload(
  fileName: string,
  mimeType: string,
  stream: ReadableStream<Uint8Array>,
  size: number
): Promise<UploadResult> {
  // Convertir stream a buffer
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
  
  // Guardar temporalmente
  const tempPath = path.join('/tmp', fileName);
  fs.writeFileSync(tempPath, buffer);
  
  try {
    // Subir a Google Drive
    const response = await this.drive.files.create({
      requestBody: {
        name: fileName,
        parents: [this.folderId]
      },
      media: {
        mimeType,
        body: fs.createReadStream(tempPath)
      },
      fields: 'id, name, mimeType, size, createdTime'
    });
    
    // Limpiar archivo temporal
    fs.unlinkSync(tempPath);
    
    return {
      fileId: response.data.id!,
      fileName: response.data.name!,
      mimeType: response.data.mimeType!,
      size: parseInt(response.data.size || '0', 10)
    };
  } catch (error) {
    // Limpiar en caso de error
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    throw error;
  }
}
```

**Descargar archivo:**
```typescript
async download(fileId: string): Promise<DownloadResult> {
  // Obtener metadata
  const metadata = await this.drive.files.get({
    fileId,
    fields: 'id, name, mimeType, size, createdTime'
  });
  
  // Descargar contenido como stream
  const response = await this.drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );
  
  // Crear ReadableStream desde el response
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      response.data.on('data', (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk));
      });
      response.data.on('end', () => {
        controller.close();
      });
      response.data.on('error', (err: Error) => {
        controller.error(err);
      });
    }
  });
  
  return {
    stream,
    metadata: {
      fileId: metadata.data.id!,
      fileName: metadata.data.name!,
      mimeType: metadata.data.mimeType!,
      size: parseInt(metadata.data.size || '0', 10),
      createdAt: new Date(metadata.data.createdTime!)
    }
  };
}
```

**Eliminar archivo:**
```typescript
async delete(fileId: string): Promise<void> {
  await this.drive.files.delete({ fileId });
}
```

**Obtener metadata:**
```typescript
async getMetadata(fileId: string): Promise<FileMetadata> {
  const response = await this.drive.files.get({
    fileId,
    fields: 'id, name, mimeType, size, createdTime'
  });
  
  return {
    fileId: response.data.id!,
    fileName: response.data.name!,
    mimeType: response.data.mimeType!,
    size: parseInt(response.data.size || '0', 10),
    createdAt: new Date(response.data.createdTime!)
  };
}
```

### 2. Streams - ReadableStream/WritableStream

**Manejo de streams para archivos grandes:**
```typescript
// Consumir ReadableStream del request
async function handleUpload(request: FastifyRequest, reply: FastifyReply) {
  const parts = request.parts();
  let fileBuffer: Buffer[] = [];
  let totalSize = 0;
  
  for await (const part of parts) {
    if (part.type === 'file') {
      const reader = part.file;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        fileBuffer.push(Buffer.from(value));
        totalSize += value.length;
        
        // Verificar tamaño máximo (128MB)
        if (totalSize > 128 * 1024 * 1024) {
          throw new Error('Archivo demasiado grande');
        }
      }
    }
  }
  
  const buffer = Buffer.concat(fileBuffer);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(buffer));
      controller.close();
    }
  });
  
  // Subir a storage
  const result = await storage.upload(fileName, mimeType, stream, totalSize);
}
```

**Procesamiento en chunks:**
```typescript
async function processLargeFile(
  inputStream: ReadableStream<Uint8Array>,
  chunkSize: number = 1024 * 1024 // 1MB
): Promise<Buffer[]> {
  const chunks: Buffer[] = [];
  const reader = inputStream.getReader();
  let chunk: Buffer[] = [];
  let bytesInChunk = 0;
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      chunk.push(Buffer.from(value));
      bytesInChunk += value.length;
      
      if (bytesInChunk >= chunkSize) {
        chunks.push(Buffer.concat(chunk));
        chunk = [];
        bytesInChunk = 0;
      }
    }
    
    // Agregar chunk restante
    if (chunk.length > 0) {
      chunks.push(Buffer.concat(chunk));
    }
  } finally {
    reader.releaseLock();
  }
  
  return chunks;
}
```

### 3. Factory Pattern - IStorage Interface

**Interfaz abstracción:**
```typescript
// interfaces/IStorage.ts
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
  upload(
    fileName: string,
    mimeType: string,
    stream: ReadableStream<Uint8Array>,
    size: number
  ): Promise<UploadResult>;
  
  download(fileId: string): Promise<DownloadResult>;
  delete(fileId: string): Promise<void>;
  getMetadata(fileId: string): Promise<FileMetadata>;
}

export interface IStorageFactory {
  getStorage(): IStorage;
}
```

**Implementación Factory:**
```typescript
// services/StorageFactory.ts
import { IStorage, IStorageFactory } from '../interfaces/IStorage.js';
import { googleDriveStorage } from './GoogleDriveStorage.js';

export class StorageFactory implements IStorageFactory {
  private static instance: StorageFactory;
  private storage: IStorage;

  private constructor() {
    // Por defecto usar Google Drive
    this.storage = googleDriveStorage;
  }

  static getInstance(): StorageFactory {
    if (!StorageFactory.instance) {
      StorageFactory.instance = new StorageFactory();
    }
    return StorageFactory.instance;
  }

  getStorage(): IStorage {
    return this.storage;
  }
  
  // Método para cambiar storage (útil para testing o futuro S3)
  setStorage(storage: IStorage): void {
    this.storage = storage;
  }
}

export const storageFactory = StorageFactory.getInstance();
export const storage = storageFactory.getStorage();
```

**Cambiar a S3 en el futuro:**
```typescript
// En el futuro, para cambiar a AWS S3:
// 1. Crear S3Storage implementando IStorage
// 2. Actualizar StorageFactory

export class S3Storage implements IStorage {
  private s3Client: S3Client;
  private bucket: string;
  
  async upload(fileName: string, mimeType: string, stream: ReadableStream<Uint8Array>, size: number): Promise<UploadResult> {
    // Implementar con AWS SDK
  }
  
  async download(fileId: string): Promise<DownloadResult> {
    // Implementar con AWS SDK
  }
  
  async delete(fileId: string): Promise<void> {
    // Implementar con AWS SDK
  }
  
  async getMetadata(fileId: string): Promise<FileMetadata> {
    // Implementar con AWS SDK
  }
}

// Uso
storageFactory.setStorage(new S3Storage());
```

### 4. Mock Mode - Desarrollo sin credenciales

**Modo mock para desarrollo:**
```typescript
export class GoogleDriveStorage implements IStorage {
  private static instance: GoogleDriveStorage;
  private drive: drive_v3.Drive;
  private folderId: string;
  private mockMode: boolean = false;

  private constructor() {
    const credentialsPath = process.env.GOOGLE_DRIVE_CREDENTIALS_PATH || './config/google-drive-credentials.json';
    
    try {
      const credentials = JSON.parse(fs.readFileSync(path.resolve(credentialsPath), 'utf-8'));
      this.folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '';
      
      if (credentials) {
        const auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/drive']
        });
        this.drive = google.drive({ version: 'v3', auth });
      } else {
        this.mockMode = true;
        this.drive = null as any;
      }
    } catch {
      // Si no existen credenciales, usar modo mock
      this.mockMode = true;
      this.drive = null as any;
    }
  }

  async upload(fileName: string, mimeType: string, stream: ReadableStream<Uint8Array>, size: number): Promise<UploadResult> {
    if (this.mockMode) {
      return this.mockUpload(fileName, mimeType, size);
    }
    // ... implementación real
  }
  
  private mockUpload(fileName: string, mimeType: string, size: number): UploadResult {
    const mockFileId = `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    console.log(`[MOCK] Uploading ${fileName} (${size} bytes) to Google Drive`);
    
    return {
      fileId: mockFileId,
      fileName,
      mimeType,
      size
    };
  }
  
  async download(fileId: string): Promise<DownloadResult> {
    if (this.mockMode) {
      return this.mockDownload(fileId);
    }
    // ... implementación real
  }
  
  private mockDownload(fileId: string): DownloadResult {
    console.log(`[MOCK] Downloading file ${fileId} from Google Drive`);
    
    const encoder = new TextEncoder();
    const mockContent = `Mock file content for ${fileId}`;
    
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(mockContent));
        controller.close();
      }
    });
    
    return {
      stream,
      metadata: {
        fileId,
        fileName: `mock-file-${fileId}.bin`,
        mimeType: 'application/octet-stream',
        size: mockContent.length,
        createdAt: new Date()
      }
    };
  }
}

export const googleDriveStorage = GoogleDriveStorage.getInstance();
```

### 5. Memory Management

**Control de memoria para archivos grandes:**
```typescript
const MAX_FILE_SIZE = 128 * 1024 * 1024; // 128MB

async function handleFileUpload(request: FastifyRequest) {
  const parts = request.parts();
  let totalSize = 0;
  
  for await (const part of parts) {
    if (part.type === 'file') {
      const file = part.file;
      let bytes = 0;
      
      // Procesar en chunks para no saturar memoria
      while (true) {
        const { done, value } = await file.read();
        if (done) break;
        
        bytes += value.length;
        totalSize += value.length;
        
        // Verificar límite de tamaño
        if (totalSize > MAX_FILE_SIZE) {
          throw new Error(`Archivo demasiado grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
        }
      }
    }
  }
  
  return totalSize;
}
```

**Streams para archivos grandes:**
```typescript
// Evitar cargar todo en memoria
async function streamToGoogleDrive(
  inputStream: ReadableStream<Uint8Array>,
  fileName: string,
  mimeType: string
) {
  // Crear archivo temporal mínimo
  const tempPath = path.join('/tmp', `upload_${Date.now()}`);
  const writeStream = fs.createWriteStream(tempPath);
  
  const reader = inputStream.getReader();
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      // Escribir chunk directamente a disco
      writeStream.write(Buffer.from(value));
    }
  } finally {
    writeStream.end();
    reader.releaseLock();
  }
  
  // Subir archivo temporal
  try {
    const result = await drive.files.create({
      requestBody: { name: fileName, parents: [folderId] },
      media: { body: fs.createReadStream(tempPath) }
    });
    
    return result.data.id;
  } finally {
    // Limpiar archivo temporal
    fs.unlinkSync(tempPath);
  }
}
```

## Testing con Vitest

### Unit Tests

**Test de GoogleDriveStorage:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleDriveStorage } from './GoogleDriveStorage.js';

vi.mock('fs', () => ({
  readFileSync: vi.fn().mockReturnValue('{}'),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  existsSync: vi.fn().mockReturnValue(true),
  createReadStream: vi.fn()
}));

vi.mock('googleapis', () => {
  const mockDrive = {
    files: {
      create: vi.fn(),
      get: vi.fn(),
      delete: vi.fn()
    }
  };
  return {
    google: {
      drive: vi.fn(() => mockDrive),
      auth: { GoogleAuth: vi.fn() }
    }
  };
});

describe('GoogleDriveStorage', () => {
  let storage: GoogleDriveStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('GOOGLE_DRIVE_CREDENTIALS_PATH', './config/credentials.json');
    vi.stubEnv('GOOGLE_DRIVE_FOLDER_ID', 'test-folder-id');
    storage = new GoogleDriveStorage();
  });

  it('should return singleton instance', () => {
    const instance1 = GoogleDriveStorage.getInstance();
    const instance2 = GoogleDriveStorage.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should upload file in mock mode when no credentials', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
        controller.close();
      }
    });

    const result = await storage.upload('test.exe', 'application/octet-stream', stream, 3);

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
```

### Mock de File System

```typescript
// test/mocks/fs.ts
export const mockFs = {
  readFileSync: vi.fn().mockReturnValue('{}'),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  existsSync: vi.fn().mockReturnValue(true),
  createReadStream: vi.fn(() => ({
    on: vi.fn(),
    pipe: vi.fn()
  }))
};
```

### Integration Tests

**Test de upload real:**
```typescript
import { describe, it, expect, beforeAll } from 'vitest';

describe('Google Drive Integration', () => {
  const storage = new GoogleDriveStorage();
  
  // Solo ejecutar si hay credenciales
  const hasCredentials = process.env.GOOGLE_DRIVE_CREDENTIALS_PATH;

  it.skipIf(!hasCredentials)('should upload a file', async () => {
    const content = 'Test file content';
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(content));
        controller.close();
      }
    });

    const result = await storage.upload(
      'test-file.txt',
      'text/plain',
      stream,
      content.length
    );

    expect(result.fileId).toBeDefined();
    
    // Cleanup
    await storage.delete(result.fileId);
  });

  it.skipIf(!hasCredentials)('should download a file', async () => {
    // First upload
    const content = 'Test download content';
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(content));
        controller.close();
      }
    });

    const uploadResult = await storage.upload(
      'test-download.txt',
      'text/plain',
      stream,
      content.length
    );

    // Then download
    const downloadResult = await storage.download(uploadResult.fileId);
    
    expect(downloadResult.metadata.fileName).toBe('test-download.txt');

    // Cleanup
    await storage.delete(uploadResult.fileId);
  });
});
```

## Configuración Necesaria

### Dependencies
```json
{
  "dependencies": {
    "googleapis": "^130.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0"
  }
}
```

### Variables de Entorno
```env
GOOGLE_DRIVE_CREDENTIALS_PATH="./config/google-drive-credentials.json"
GOOGLE_DRIVE_FOLDER_ID="your-folder-id"
```

### Credentials JSON (Service Account)
```json
{
  "type": "service_account",
  "project_id": "your-project",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "your-service@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

## Implementación Paso a Paso

1. **Configurar Google Cloud:**
   - Crear proyecto en Google Cloud Console
   - Habilitar Google Drive API
   - Crear service account
   - Descargar credenciales JSON
   - Compartir carpeta de Drive con service account

2. **Instalar dependencias:**
   ```bash
   npm install googleapis
   ```

3. **Crear estructura:**
   ```
   src/
   ├── interfaces/
   │   └── IStorage.ts
   ├── services/
   │   ├── GoogleDriveStorage.ts
   │   └── StorageFactory.ts
   └── config/
       └── google-drive-credentials.json
   ```

4. **Implementar IStorage interface:**
   - Definir tipos FileMetadata, UploadResult, DownloadResult
   - Crear interfaz IStorage

5. **Implementar GoogleDriveStorage:**
   - Constructor con autenticación
   - Métodos: upload, download, delete, getMetadata
   - Agregar modo mock para desarrollo

6. **Implementar StorageFactory:**
   - Patrón Singleton
   - Método para obtener storage

7. **Integrar con rutas:**
   - POST /drivers/upload
   - GET /drivers/:id/download

8. **Ejecutar tests:**
   ```bash
   npm test
   ```

## Links de Referencia

- [Google Drive API v3](https://developers.google.com/drive/api/v3)
- [Google Auth Library](https://github.com/googleapis/google-auth-library-nodejs)
- [Google APIs Node.js Client](https://github.com/googleapis/nodejs-client)
- [ReadableStream MDN](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream)
- [Node.js Streams](https://nodejs.org/api/stream.html)

## Validación

Para verificar la implementación:

```bash
# Verificar credenciales
node -e "console.log(require('./config/google-drive-credentials.json').client_email)"

# Ejecutar tests
npm test

# Probar upload (desarrollo)
curl -X POST http://localhost:3001/drivers/upload -F "file=@test.exe"
```