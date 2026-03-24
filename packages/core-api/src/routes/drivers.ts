import { Router, Request, Response, NextFunction } from 'express';
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
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

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

export const driverRouter = Router();

driverRouter.use(authMiddleware);

driverRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cursor, limit, brand, model, hardwareType, search } = req.query as unknown as DriverQueryInput;

    const drivers = await driverRepository.findAllWithCursor(
      { brand, model, hardwareType, search },
      {
        limit: limit || 20,
        cursor: cursor ? JSON.parse(cursor) as CursorParams : undefined,
      }
    );

    const nextCursor =
      drivers.length === (limit || 20)
        ? JSON.stringify({
            id: drivers[drivers.length - 1].id,
            createdAt: drivers[drivers.length - 1].createdAt,
          })
        : null;

    return res.json({
      success: true,
      data: drivers,
      pagination: { nextCursor, hasMore: !!nextCursor },
    });
  } catch (error) {
    next(error);
  }
});

driverRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new NotFoundError('Driver');

    const driver = await driverRepository.findById(id);
    if (!driver) throw new NotFoundError('Driver');

    return res.json({ success: true, data: driver });
  } catch (error) {
    next(error);
  }
});

driverRouter.post(
  '/',
  requireRole('ADMIN_SISTEMAS', 'SOPORTE_WP'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parseResult = CreateDriverSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw new BadRequestError(parseResult.error.errors[0].message);
      }

      const driver = await driverRepository.create({
        ...parseResult.data,
        uploadedById: req.user!.userId,
      });
      return res.status(201).json({ success: true, data: driver });
    } catch (error) {
      next(error);
    }
  }
);

driverRouter.put(
  '/:id',
  requireRole('ADMIN_SISTEMAS', 'SOPORTE_WP'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) throw new NotFoundError('Driver');

      const existing = await driverRepository.findById(id);
      if (!existing) throw new NotFoundError('Driver');

      const parseResult = UpdateDriverSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw new BadRequestError(parseResult.error.errors[0].message);
      }

      const driver = await driverRepository.update(id, parseResult.data);
      return res.json({ success: true, data: driver });
    } catch (error) {
      next(error);
    }
  }
);

driverRouter.delete(
  '/:id',
  requireRole('ADMIN_SISTEMAS'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) throw new NotFoundError('Driver');

      const existing = await driverRepository.findById(id);
      if (!existing) throw new NotFoundError('Driver');

      if (existing.driveFileId) {
        await storage.delete(existing.driveFileId);
      }
      await driverRepository.delete(id);

      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

driverRouter.post(
  '/upload',
  requireRole('ADMIN_SISTEMAS', 'SOPORTE_WP'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const file = (req as any).file;

      if (!file) {
        throw new BadRequestError('Archivo requerido');
      }

      const fileName = file.originalname;
      const extension = '.' + fileName.split('.').pop()?.toLowerCase();

      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        throw new BadRequestError(
          `Extensión no permitida. Permitidas: ${ALLOWED_EXTENSIONS.join(', ')}`
        );
      }

      const size = file.size;

      if (size > MAX_FILE_SIZE) {
        throw new BadRequestError(`Archivo demasiado grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      }

      const mimeType = getMimeType(extension);
      const uploadResult = await storage.upload(fileName, mimeType, file.buffer, size);

      return res.status(201).json({
        success: true,
        data: {
          driveFileId: uploadResult.fileId,
          fileName: uploadResult.fileName,
          fileSize: uploadResult.size,
          mimeType: uploadResult.mimeType,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

driverRouter.get('/:id/download', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new NotFoundError('Driver');

    const driver = await driverRepository.findById(id);
    if (!driver) throw new NotFoundError('Driver');

    if (!driver.driveFileId) {
      throw new NotFoundError('Archivo del driver no encontrado');
    }

    const { stream, metadata } = await storage.download(driver.driveFileId);

    res.setHeader('Content-Type', metadata.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${metadata.fileName}"`);
    res.setHeader('Content-Length', metadata.size);

    return res.send(stream);
  } catch (error) {
    next(error);
  }
});

driverRouter.get('/:id/file', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new NotFoundError('Driver');

    const driver = await driverRepository.findById(id);
    if (!driver) throw new NotFoundError('Driver');

    if (!driver.driveFileId) {
      throw new NotFoundError('Archivo del driver no encontrado');
    }

    const metadata = await storage.getMetadata(driver.driveFileId);

    return res.json({
      success: true,
      data: {
        fileId: metadata.fileId,
        fileName: metadata.fileName,
        fileSize: metadata.size,
        mimeType: metadata.mimeType,
        createdAt: metadata.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

driverRouter.delete(
  '/:id/file',
  requireRole('ADMIN_SISTEMAS', 'SOPORTE_WP'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
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

      return res.json({ success: true, message: 'Archivo eliminado' });
    } catch (error) {
      next(error);
    }
  }
);
