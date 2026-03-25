import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import swaggerUi from 'swagger-ui-express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';

import { authRouter } from './routes/auth.js';
import { driverRouter } from './routes/drivers.js';
import { publicRepoRouter } from './routes/publicRepo.js';
import { userRouter } from './routes/users.js';
import { HttpError } from './utils/errors.js';
import { logError, logInfo } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app: Express = express();

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT',
      message: 'Demasiados intentos de login. Intente de nuevo en 15 minutos.',
    },
  },
});

app.use((req: Request, _res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

const swaggerFile = readFileSync(join(__dirname, 'config', 'swagger.yaml'), 'utf-8');
const swaggerDocument = YAML.parse(swaggerFile);

app.get('/swagger.json', (_req: Request, res: Response) => {
  res.json(swaggerDocument);
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  swaggerOptions: {
    persistAuthorization: true,
    url: '/swagger.json',
  },
}));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/auth', authLimiter, authRouter);
app.use('/drivers', driverRouter);
app.use('/public-repo', publicRepoRouter);
app.use('/users', userRouter);

app.use((err: Error | HttpError, _req: Request, res: Response, _next: NextFunction) => {
  const context = err instanceof HttpError ? `HTTP ${err.statusCode}` : 'Express';
  logError(err, context);

  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: err.message,
      },
    });
  }

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
    },
  });
});

const PORT = Number(process.env.PORT) || 8000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Core-API running on port ${PORT}`);
});

function gracefulShutdown(signal: string) {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
  
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logError(error, 'UncaughtException');
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logError(reason as Error, 'UnhandledRejection');
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
