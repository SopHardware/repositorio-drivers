# API Documentation - Repositorio Drivers

## Base URL
```
http://localhost:3001
```

## Autenticación

La API usa **JWT (JSON Web Tokens)** para autenticación.

### Flujo de Autenticación
1. **Login**: POST `/auth/login` → Recibes `accessToken` y `refreshToken`
2. **Usar Access Token**: Incluir en header `Authorization: Bearer <accessToken>`
3. **Renovar**: POST `/auth/refresh` cuando el accessToken expire

---

## Endpoints

### 🔐 Authentication

#### POST /auth/login
Iniciar sesión en el sistema.

**Request:**
```json
{
  "username": "admin_sistemas",
  "password": "AdminSistemas2026!"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error (400):**
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Credenciales inválidas"
  }
}
```

---

#### POST /auth/refresh
Renovar tokens de acceso.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 👥 Users

**Roles disponibles:** `ADMIN_SISTEMAS`, `SOPORTE_WP`, `CONSULTA`

#### GET /users
Lista todos los usuarios (solo ADMIN_SISTEMAS).

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "cuid123...",
      "username": "admin_sistemas",
      "role": "ADMIN_SISTEMAS",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

#### GET /users/:id
Ver usuario específico.

**Params:** `id` - ID del usuario

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "cuid123...",
    "username": "admin_sistemas",
    "role": "ADMIN_SISTEMAS",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### POST /users
Crear nuevo usuario.

**Headers:** `Authorization: Bearer <accessToken>`

**Request:**
```json
{
  "username": "nuevo_usuario",
  "password": "Password123!",
  "role": "SOPORTE_WP"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "cuid456...",
    "username": "nuevo_usuario",
    "role": "SOPORTE_WP",
    "createdAt": "2024-01-02T00:00:00.000Z",
    "updatedAt": "2024-01-02T00:00:00.000Z"
  }
}
```

---

#### PUT /users/:id/password
Cambiar contraseña de usuario.

**Headers:** `Authorization: Bearer <accessToken>`

**Request:**
```json
{
  "currentPassword": "Password123!",
  "newPassword": "NuevaPassword456!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Contraseña actualizada"
}
```

---

#### DELETE /users/:id
Eliminar usuario.

**Headers:** `Authorization: Bearer <accessToken>`

**Response:** `204 No Content`

---

### 💾 Drivers

**Tipos de hardware:** `IMPRESORA`, `ESCANER`, `TARJETA_RED`, `USB`, `DISCO_DURO`, `OPTICO`, `OTRO`

#### GET /drivers
Listar drivers con paginación y filtros.

**Headers:** `Authorization: Bearer <accessToken>`

**Query Parameters:**
| Param | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| cursor | string | Cursor de paginación | `{"id":10,"createdAt":"..."}` |
| limit | number | Items por página (1-100) | `20` |
| brand | string | Filtrar por marca | `HP` |
| model | string | Filtrar por modelo | `LaserJet` |
| hardwareType | string | Filtrar por tipo | `IMPRESORA` |
| search | string | Búsqueda textual | `driver` |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "driverName": "HP LaserJet Pro M404dn",
      "brand": "HP",
      "model": "M404dn",
      "version": "1.0.0",
      "hardwareType": "IMPRESORA",
      "driveFileId": "abc123...",
      "fileExtension": ".exe",
      "fileSize": 15000000,
      "uploadedById": "cuid123...",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "nextCursor": "eyJpZCI6MTAsImNyZWF0ZWRBdCI6IjIwMjQtMDEtMDFUMDA6MDA6MDAuMDAwWiJ9",
    "hasMore": true
  }
}
```

---

#### GET /drivers/:id
Ver driver específico.

**Params:** `id` - ID numérico del driver

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "driverName": "HP LaserJet Pro M404dn",
    "brand": "HP",
    "model": "M404dn",
    "version": "1.0.0",
    "hardwareType": "IMPRESORA",
    "driveFileId": "abc123...",
    "fileExtension": ".exe",
    "fileSize": 15000000,
    "uploadedById": "cuid123...",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### POST /drivers
Crear registro de driver (requiere archivo subido primero).

**Headers:** `Authorization: Bearer <accessToken>`

**Request:**
```json
{
  "driverName": "HP LaserJet Pro M404dn",
  "brand": "HP",
  "model": "M404dn",
  "version": "1.0.0",
  "hardwareType": "IMPRESORA",
  "driveFileId": "abc123...",
  "fileExtension": ".exe",
  "fileSize": 15000000
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "driverName": "HP LaserJet Pro M404dn",
    "brand": "HP",
    "model": "M404dn",
    "version": "1.0.0",
    "hardwareType": "IMPRESORA",
    "driveFileId": "abc123...",
    "fileExtension": ".exe",
    "fileSize": 15000000,
    "uploadedById": "cuid123...",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### PUT /drivers/:id
Actualizar metadata de driver.

**Headers:** `Authorization: Bearer <accessToken>`

**Request (todos los campos opcionales):**
```json
{
  "driverName": "Nuevo Nombre",
  "brand": "Nueva Marca",
  "model": "Nuevo Modelo",
  "version": "2.0.0",
  "hardwareType": "IMPRESORA"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { ...driverActualizado }
}
```

---

#### DELETE /drivers/:id
Eliminar driver y su archivo de Google Drive.

**Headers:** `Authorization: Bearer <accessToken>`

**Response:** `204 No Content`

---

#### POST /drivers/upload
Subir archivo de driver a Google Drive.

**Headers:** 
- `Authorization: Bearer <accessToken>`
- `Content-Type: multipart/form-data`

**Body (form-data):**
- `file`: Archivo binario

**Extensiones permitidas:** `.exe`, `.zip`, `.rar`, `.7z`, `.msi`, `.dmg`, `.pkg`, `.deb`, `.rpm`

**Tamaño máximo:** 128MB

**Response (201):**
```json
{
  "success": true,
  "data": {
    "driveFileId": "1abc234...",
    "fileName": "driver.exe",
    "fileSize": 15000000,
    "mimeType": "application/x-msdownload"
  }
}
```

---

#### GET /drivers/:id/download
Descargar archivo del driver.

**Headers:** `Authorization: Bearer <accessToken>`

**Response:** Archivo binario (stream)

**Headers de respuesta:**
- `Content-Type`: mimeType del archivo
- `Content-Disposition`: `attachment; filename="driver.exe"`
- `Content-Length`: tamaño en bytes

---

#### GET /drivers/:id/file
Ver metadata del archivo en Google Drive.

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "fileId": "1abc234...",
    "fileName": "driver.exe",
    "fileSize": 15000000,
    "mimeType": "application/x-msdownload",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### DELETE /drivers/:id/file
Eliminar archivo de Google Drive (mantiene el registro).

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{
  "success": true,
  "message": "Archivo eliminado"
}
```

---

### 🏥 Health

#### GET /health
Verificar estado del servicio.

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Códigos de Error

| Código | Descripción |
|--------|-------------|
| 400 | Bad Request - Datos inválidos |
| 401 | Unauthorized - No autenticado |
| 403 | Forbidden - Sin permisos |
| 404 | Not Found - Recurso no encontrado |
| 409 | Conflict - Conflicto de datos |
| 413 | Payload Too Large - Archivo muy grande |
| 500 | Internal Server Error - Error del servidor |

---

## Formato de Respuesta

Todas las respuestas siguen este formato:

```json
{
  "success": true,
  "data": { ... },
  "pagination": { ... }  // solo en listados
}
```

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Mensaje de error",
    "details": { ... }  // opcional, para errores de validación
  }
}
```

---

## Recursos Adicionales

- **Swagger UI**: http://localhost:3001/docs
- **Google Drive**: Los archivos se almacenan en Google Drive usando la API de Google

---

*Documentación generada automáticamente*