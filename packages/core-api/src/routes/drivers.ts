import { FastifyInstance, FastifyRequest } from 'fastify';
import { driverRepository } from '../repositories/PrismaRepository.js';
import {
  CreateDriverSchema,
  UpdateDriverSchema,
  DriverQuerySchema,
  CreateDriverInput,
  UpdateDriverInput,
  DriverQueryInput,
} from '../dto/index.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { NotFoundError, UnauthorizedError } from '../utils/errors.js';
import { HardwareDriver } from '@prisma/client';

interface CursorParams {
  id: number;
  createdAt: Date;
}

export async function driverRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', authMiddleware);

  fastify.get<{ Querystring: DriverQueryInput }>(
    '/',
    { schema: { querystring: DriverQuerySchema } },
    async (request, reply) => {
      const { cursor, limit, brand, model, hardwareType, search } = request.query;

      const drivers = await driverRepository.findAllWithCursor(
        {
          brand,
          model,
          hardwareType,
          search,
        },
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
        pagination: {
          nextCursor,
          hasMore: !!nextCursor,
        },
      });
    }
  );

  fastify.get<{ Params: { id: string } }>(
    '/:id',
    async (request, reply) => {
      const id = parseInt(request.params.id, 10);

      if (isNaN(id)) {
        throw new NotFoundError('Driver');
      }

      const driver = await driverRepository.findById(id);
      if (!driver) {
        throw new NotFoundError('Driver');
      }

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

      if (isNaN(id)) {
        throw new NotFoundError('Driver');
      }

      const existing = await driverRepository.findById(id);
      if (!existing) {
        throw new NotFoundError('Driver');
      }

      const driver = await driverRepository.update(id, request.body);
      return reply.send({ success: true, data: driver });
    }
  );

  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    requireRole('ADMIN_SISTEMAS'),
    async (request, reply) => {
      const id = parseInt(request.params.id, 10);

      if (isNaN(id)) {
        throw new NotFoundError('Driver');
      }

      const existing = await driverRepository.findById(id);
      if (!existing) {
        throw new NotFoundError('Driver');
      }

      await driverRepository.delete(id);
      return reply.status(204).send();
    }
  );
}
