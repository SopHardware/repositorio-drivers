import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const LoginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export const CreateUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
  role: z.enum(['ADMIN_SISTEMAS', 'SOPORTE_WP', 'CONSULTA']),
});

export const UpdatePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(6).max(100),
});

export const CreateDriverSchema = z.object({
  driverName: z.string().min(1).max(200),
  brand: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  version: z.string().min(1).max(50),
  hardwareType: z.enum([
    'IMPRESORA',
    'ESCANER',
    'TARJETA_RED',
    'USB',
    'DISCO_DURO',
    'OPTICO',
    'OTRO',
  ]),
  driveFileId: z.string().min(1),
  fileExtension: z.string().min(1).max(20),
  fileSize: z.number().int().positive(),
});

export const UpdateDriverSchema = z.object({
  driverName: z.string().min(1).max(200).optional(),
  brand: z.string().min(1).max(100).optional(),
  model: z.string().min(1).max(100).optional(),
  version: z.string().min(1).max(50).optional(),
  hardwareType: z
    .enum(['IMPRESORA', 'ESCANER', 'TARJETA_RED', 'USB', 'DISCO_DURO', 'OPTICO', 'OTRO'])
    .optional(),
});

export const DriverQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  brand: z.string().optional(),
  model: z.string().optional(),
  hardwareType: z
    .enum(['IMPRESORA', 'ESCANER', 'TARJETA_RED', 'USB', 'DISCO_DURO', 'OPTICO', 'OTRO'])
    .optional(),
  search: z.string().optional(),
});

export const LoginSchemaJSON = zodToJsonSchema(LoginSchema, 'LoginSchema');
export const RefreshTokenSchemaJSON = zodToJsonSchema(RefreshTokenSchema, 'RefreshTokenSchema');
export const CreateUserSchemaJSON = zodToJsonSchema(CreateUserSchema, 'CreateUserSchema');
export const UpdatePasswordSchemaJSON = zodToJsonSchema(UpdatePasswordSchema, 'UpdatePasswordSchema');
export const CreateDriverSchemaJSON = zodToJsonSchema(CreateDriverSchema, 'CreateDriverSchema');
export const UpdateDriverSchemaJSON = zodToJsonSchema(UpdateDriverSchema, 'UpdateDriverSchema');
export const DriverQuerySchemaJSON = zodToJsonSchema(DriverQuerySchema, 'DriverQuerySchema');

export type LoginInput = z.infer<typeof LoginSchema>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdatePasswordInput = z.infer<typeof UpdatePasswordSchema>;
export type CreateDriverInput = z.infer<typeof CreateDriverSchema>;
export type UpdateDriverInput = z.infer<typeof UpdateDriverSchema>;
export type DriverQueryInput = z.infer<typeof DriverQuerySchema>;
