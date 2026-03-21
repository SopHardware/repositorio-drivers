import Fastify, { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { authRoutes } from './routes/auth.js';
import { driverRoutes } from './routes/drivers.js';
import { userRoutes } from './routes/users.js';
import { HttpError } from './utils/errors.js';

const fastify: FastifyInstance = Fastify({
  logger: true,
});

fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

fastify.register(authRoutes, { prefix: '/auth' });
fastify.register(driverRoutes, { prefix: '/drivers' });
fastify.register(userRoutes, { prefix: '/users' });

fastify.setErrorHandler((error: FastifyError | HttpError, request: FastifyRequest, reply: FastifyReply) => {
  fastify.log.error(error);

  if (error instanceof HttpError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
  }

  if (error.validation) {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Datos de entrada inválidos',
        details: error.validation,
      },
    });
  }

  return reply.status(500).send({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
    },
  });
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Core-API running on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
