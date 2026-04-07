import dotenv from 'dotenv';
dotenv.config();

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

// CORS dinámico desde variable de entorno
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5001', 'http://localhost:5002', 'http://localhost:5003'];

// Allow all origins for public-repo if PUBLIC_REPO_ORIGINS=*
const publicRepoAllowAll = process.env.PUBLIC_REPO_ORIGINS === '*';

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) {
      return callback(null, true);
    }

    // Check if PUBLIC_REPO_ORIGINS=* is set
    if (publicRepoAllowAll) {
      return callback(null, true);
    }

    // Otherwise use the whitelist
    if (corsOrigins.includes(origin)) {
      return callback(null, origin);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '4gb' }));
app.use(express.urlencoded({ limit: '4gb', extended: true }));

// Cargar swagger antes de definir rutas
const swaggerFile = readFileSync(join(process.cwd(), 'src', 'config', 'swagger.yaml'), 'utf-8');
const swaggerDocument = YAML.parse(swaggerFile);

// Swagger ANTES de helmet para evitar conflictos de COOP/COEP en swagger-ui
app.get('/swagger.json', (_req: Request, res: Response) => {
  res.json(swaggerDocument);
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  swaggerOptions: {
    persistAuthorization: true,
    url: '/swagger.json',
  },
}));

// Helmet después de swagger para no afectar las rutas de documentación
app.use(helmet({
  contentSecurityPolicy: false,
}));

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
