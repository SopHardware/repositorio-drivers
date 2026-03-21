import { FastifyInstance, FastifyRequest } from 'fastify';
import { driverRepository } from '../repositories/PrismaRepository.js';
import { storage } from '../services/StorageFactory.js';
import {
  CreateDriverSchema,
  UpdateDriverSchema,
  DriverQuerySchema,
  CreateDriverInput,
  UpdateDriverInput,
  DriverQueryInput,
} from '../dto/index.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { MultipartFile } from '@fastify/multipart';

interface CursorParams {
  id: number;
  createdAt: Date;
}

const ALLOWED_EXTENSIONS = ['.exe', '.zip', '.rar', '.7z', '.msi', '.dmg', '.pkg', '.deb', '.rpm'];
const MAX_FILE_SIZE = 128 * 1024 * 1024;

function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    '.exe': 'application/x-msdownload',
    '.zip': 'application/zip',
    '.rar': 'application/vnd.rar',
    '.7z': 'application/x-7z-compressed',
    '.msi': 'application/x-msi',
    '.dmg': 'application/x-apple-diskimage',
    '.pkg': 'application/x-newton-compatible-pkg',
    '.deb': 'application/x-debian-package',
    '.rpm': 'application/x-rpm',
  };
  return mimeTypes[extension] || 'application/octet-stream';
}

export async function driverRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', authMiddleware);

  fastify.get<{ Querystring: DriverQueryInput }>(
    '/',
    { schema: { querystring: DriverQuerySchema } },
    async (request, reply) => {
      const { cursor, limit, brand, model, hardwareType, search } = request.query;

      const drivers = await driverRepository.findAllWithCursor(
        { brand, model, hardwareType, search },
        {
          limit: limit || 20,
          cursor: cursor ? JSON.parse(cursor) as CursorParams : undefined,
        }
      );

      const nextCursor =
        drivers.length === limit
          ? JSON.stringify({
              id: drivers[drivers.length - 1].id,
              createdAt: drivers[drivers.length - 1].createdAt,
            })
          : null;

      return reply.send({
        success: true,
        data: drivers,
        pagination: { nextCursor, hasMore: !!nextCursor },
      });
    }
  );

  fastify.get<{ Params: { id: string } }>(
    '/:id',
    async (request, reply) => {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) throw new NotFoundError('Driver');

      const driver = await driverRepository.findById(id);
      if (!driver) throw new NotFoundError('Driver');

      return reply.send({ success: true, data: driver });
    }
  );

  fastify.post<{ Body: CreateDriverInput }>(
    '/',
    { schema: { body: CreateDriverSchema } },
    requireRole('ADMIN_SISTEMAS', 'SOPORTE_WP'),
    async (request, reply) => {
      const driver = await driverRepository.create({
        ...request.body,
        uploadedById: request.user!.userId,
      });
      return reply.status(201).send({ success: true, data: driver });
    }
  );

  fastify.put<{ Params: { id: string }; Body: UpdateDriverInput }>(
    '/:id',
    { schema: { body: UpdateDriverSchema } },
    requireRole('ADMIN_SISTEMAS', 'SOPORTE_WP'),
    async (request, reply) => {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) throw new NotFoundError('Driver');

      const existing = await driverRepository.findById(id);
      if (!existing) throw new NotFoundError('Driver');

      const driver = await driverRepository.update(id, request.body);
      return reply.send({ success: true, data: driver });
    }
  );

  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    requireRole('ADMIN_SISTEMAS'),
    async (request, reply) => {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) throw new NotFoundError('Driver');

      const existing = await driverRepository.findById(id);
      if (!existing) throw new NotFoundError('Driver');

      if (existing.driveFileId) {
        await storage.delete(existing.driveFileId);
      }
      await driverRepository.delete(id);

      return reply.status(204).send();
    }
  );

  fastify.post(
    '/upload',
    requireRole('ADMIN_SISTEMAS', 'SOPORTE_WP'),
    async (request, reply) => {
      const data = await request.file();

      if (!data) {
        throw new BadRequestError('Archivo requerido');
      }

      const fileName = data.filename;
      const extension = '.' + fileName.split('.').pop()?.toLowerCase();

      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        throw new BadRequestError(
          `Extensión no permitida. Permitidas: ${ALLOWED_EXTENSIONS.join(', ')}`
        );
      }

      let size = 0;
      const chunks: Uint8Array[] = [];

      const reader = data.file;
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > MAX_FILE_SIZE) {
            throw new BadRequestError(`Archivo demasiado grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
          }
          chunks.push(value);
        }
      } catch (err: any) {
        if (err.statusCode) throw err;
        throw new BadRequestError('Error al leer el archivo');
      }

      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(chunk);
          }
          controller.close();
        },
      });

      const mimeType = getMimeType(extension);
      const uploadResult = await storage.upload(fileName, mimeType, stream, size);

      return reply.status(201).send({
        success: true,
        data: {
          driveFileId: uploadResult.fileId,
          fileName: uploadResult.fileName,
          fileSize: uploadResult.size,
          mimeType: uploadResult.mimeType,
        },
      });
    }
  );

  fastify.get<{ Params: { id: string } }>(
    '/:id/download',
    async (request, reply) => {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) throw new NotFoundError('Driver');

      const driver = await driverRepository.findById(id);
      if (!driver) throw new NotFoundError('Driver');

      if (!driver.driveFileId) {
        throw new NotFoundError('Archivo del driver no encontrado');
      }

      const { stream, metadata } = await storage.download(driver.driveFileId);

      reply.header('Content-Type', metadata.mimeType);
      reply.header('Content-Disposition', `attachment; filename="${metadata.fileName}"`);
      reply.header('Content-Length', metadata.size);

      return reply.send(stream);
    }
  );

  fastify.get<{ Params: { id: string } }>(
    '/:id/file',
    async (request, reply) => {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) throw new NotFoundError('Driver');

      const driver = await driverRepository.findById(id);
      if (!driver) throw new NotFoundError('Driver');

      if (!driver.driveFileId) {
        throw new NotFoundError('Archivo del driver no encontrado');
      }

      const metadata = await storage.getMetadata(driver.driveFileId);

      return reply.send({
        success: true,
        data: {
          fileId: metadata.fileId,
          fileName: metadata.fileName,
          fileSize: metadata.size,
          mimeType: metadata.mimeType,
          createdAt: metadata.createdAt,
        },
      });
    }
  );

  fastify.delete<{ Params: { id: string } }>(
    '/:id/file',
    requireRole('ADMIN_SISTEMAS', 'SOPORTE_WP'),
    async (request, reply) => {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) throw new NotFoundError('Driver');

      const driver = await driverRepository.findById(id);
      if (!driver) throw new NotFoundError('Driver');

      if (!driver.driveFileId) {
        throw new NotFoundError('Archivo del driver no encontrado');
      }

      await storage.delete(driver.driveFileId);
      await driverRepository.update(id, {
        driverName: driver.driverName,
        brand: driver.brand,
        model: driver.model,
        version: driver.version,
        hardwareType: driver.hardwareType,
      } as any);

      return reply.send({ success: true, message: 'Archivo eliminado' });
    }
  );
}
