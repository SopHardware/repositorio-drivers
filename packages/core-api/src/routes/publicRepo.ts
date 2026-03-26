import { Router, Request, Response, NextFunction, Router as RouterType } from 'express';
import { driverRepository } from '../repositories/PrismaRepository.js';
import { storage } from '../services/StorageFactory.js';
import { NotFoundError } from '../utils/errors.js';

interface CursorParams {
  id: number;
  createdAt: Date;
}

export const publicRepoRouter: RouterType = Router();

publicRepoRouter.get('/drivers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cursor, limit, brand, model, hardwareType, search } = req.query;

    const parsedLimit = parseInt(limit as string, 10);
    const drivers = await driverRepository.findAllWithCursor(
      {
        brand: brand as string | undefined,
        model: model as string | undefined,
        hardwareType: hardwareType as any | undefined,
        search: search as string | undefined,
      },
      {
        limit: parsedLimit || 20,
        cursor: cursor ? JSON.parse(cursor as string) as CursorParams : undefined,
      }
    );

    const nextCursor =
      drivers.length === (parsedLimit || 20)
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

publicRepoRouter.get('/drivers/:id', async (req: Request, res: Response, next: NextFunction) => {
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

publicRepoRouter.get('/drivers/:id/download', async (req: Request, res: Response, next: NextFunction) => {
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

publicRepoRouter.get('/drivers/:id/file', async (req: Request, res: Response, next: NextFunction) => {
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
