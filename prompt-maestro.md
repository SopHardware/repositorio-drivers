# PROMPT-MAESTRO: Repositorio de Drivers "Boxito"

## ⚠️ IMPORTANTE: Lee antes de empezar

Este documento establece las reglas y procesos que **DEBEN** seguirse **ANTES** de escribir cualquier código. Todo desarrollador o IA que trabaje en este proyecto debe conocer y aplicar estas reglas.

---

## 1. REGLAS OBLIGATORIAS (Pre-Codificación)

### 🔴 REGLA 1: Análisis Primero
- **OBLIGATORIO** leer los skills relacionados en `docs/skills/` antes de modificar código
- Revisar código existente en la rama `developer`
- Identificar todos los archivos relacionados antes de empezar

### 🔴 REGLA 2: Plan Obligatorio
- **NUNCA** codificar sin un plan aprobado
- Crear plan de acción por escrito antes de implementar
- El plan debe incluir: **qué**, **cómo**, **dónde**, **qué tests** se necesitan

### 🔴 REGLA 3: Seguridad Zero Trust
- **NUNCA** colocar credenciales en código
- **NUNCA** usar Prisma en admin-portal o public-repo
- **NUNCA** exponer URLs de Google Drive directamente al cliente
- Usar **exclusivamente** Variables de Entorno (.env)
- Solo `core-api` tiene acceso a DB y Google Drive

### 🔴 REGLA 4: Testing Requerido
- **Todo service nuevo** requiere test unitario
- **Todo endpoint nuevo** requiere verificación
- Ejecutar tests antes de hacer commit
- Mantener coverage > 70%

### 🔴 REGLA 5: Commits Significativos
- Usar **conventional commits** con fase
- Formato: `<tipo>(<paquete>): <descripción>`
- **PROHIBIDO** commits como "arreglos", "cambios", "fix"

---

## 2. ARQUITECTURA DEL PROYECTO

### Estructura de Triple Capa

```
┌─────────────────────────────────────────────────────────────┐
│ CAPA PÚBLICA (admin-portal, public-repo)                    │
├─────────────────────────────────────────────────────────────┤
│ ✅ PUEDE:                                                   │
│   - UI/UX con React + Tailwind                               │
│   - fetch() al core-api                                     │
│   - Manejo de estado local (useState, useContext)          │
│   - Autenticación JWT (solo admin-portal)                    │
│   - Diseño con paleta Boxito (#EA0B2A)                      │
│                                                               │
│ ❌ NO PUEDE:                                                │
│   - Acceder a PostgreSQL directamente                        │
│   - Importar @prisma/client                                  │
│   - Consumir Google Drive API                                │
│   - Guardar credenciales en código                           │
│   - Importar clases de repositories de core-api             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ CAPA CORE (core-api)                                        │
├─────────────────────────────────────────────────────────────┤
│ ✅ SOLO ESTE PAQUETE PUEDE:                                 │
│   - Conectar a PostgreSQL (Prisma)                           │
│   - Consumir Google Drive API                                │
│   - Manejar autenticación JWT                                │
│   - Proteger rutas por rol (ADMIN_SISTEMAS, SOPORTE_WP)     │
│   - actuar como proxy para descargas                        │
└─────────────────────────────────────────────────────────────┘
```

### Roles de Usuarios

| Rol | Permisos |
|-----|----------|
| ADMIN_SISTEMAS | Acceso total (users, drivers) |
| SOPORTE_WP | Gestionar drivers (crear, editar, eliminar) |
| CONSULTA | Solo lectura (no implementado aún) |

---

## 3. STACK TECNOLÓGICO

### Tecnologías Permitidas

| Capa | Tecnología | Versión |
|------|------------|---------|
| Backend | Node.js + Fastify | 18+ |
| Base de Datos | PostgreSQL + Prisma | 5.x |
| Frontend | Next.js + React | 14.x |
| Estilos | Tailwind CSS | 3.x |
| Auth | JWT + bcryptjs | - |
| Storage | Google Drive API v3 | - |
| Testing | Vitest | 1.x |
| Lenguaje | TypeScript (estricto) | 5.x |

### Dependencias PROHIBIDAS

- **NO usar Axios** - usar fetch nativo
- **NO usar Sequelize** - usar Prisma
- **NO usar MongoDB** - usar PostgreSQL
- **NO usar SQLite en producción** - solo PostgreSQL

---

## 4. PAUTAS DE DESARROLLO

### Patrones SOLID (OBLIGATORIOS)

```
Single Responsibility:
  → Los componentes de UI solo renderizan
  → La lógica de negocio vive en services
  → Los repositorios solo acceden a datos

Open/Closed:
  → IStorage interfaz para permitir cambio de proveedor
  → No modificar clases existentes, extenderlas

Interface Segregation:
  → Dashboards solo reciben datos que necesitan
  → DTOs específicos para cada operación

Dependency Inversion:
  → Depender de abstracciones, no de implementaciones
  → Usar interfaces para repositories y services
```

### Convenciones de Código

- **Archivos**: camelCase (`.ts`, `.tsx`)
- **Componentes**: PascalCase
- **Constantes**: UPPER_SNAKE_CASE
- **Interfaces**: Prefijo `I` (ej: `IDriverRepository`)
- **Types**: Prefijo según tipo (ej: `DriverFilters`)

---

## 5. PROCESO DE TRABAJO (Flujo Obligatorio)

```
┌────────────────────────────────────────────────────────────┐
│                 FLUJO DE DESARROLLO                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. 📖 ANALISIS                                           │
│     ├─ Leer prompt-maestro.md completo                   │
│     ├─ Revisar skills relacionados                       │
│     └─ Identificar dependencias                          │
│                          ↓                                 │
│  2. 📝 PLANIFICACIÓN (OBLIGATORIO)                        │
│     ├─ Crear plan por escrito                             │
│     ├─ Listar archivos a modificar                        │
│     ├─ Listar nuevos archivos                            │
│     ├─ Definir tests necesarios                           │
│     └─ Presentar para validación                         │
│                          ↓                                 │
│  3. ✅ APROBACIÓN                                         │
│     └─ Esperar validación del plan                        │
│                          ↓                                 │
│  4. 💻 IMPLEMENTACIÓN                                     │
│     ├─ Codificar según plan aprobado                     │
│     ├─ Aplicar patrones SOLID                            │
│     └─ Mantener código limpio                            │
│                          ↓                                 │
│  5. 🧪 TESTING                                            │
│     ├─ Ejecutar tests existentes                         │
│     ├─ Agregar tests para nuevo código                   │
│     └─ Verificar coverage                                │
│                          ↓                                 │
│  6. 📦 COMMIT                                             │
│     ├─ Usar conventional commits                         │
│     ├─ Incluir referencia a fase                          │
│     └─ push a rama developer                             │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 6. CONVENCIONES DE COMMIT

### Formato Obligatorio

```
<tipo>(<paquete>): <descripción>

Ejemplos:
- feat(core-api): agregar endpoint de refresh token
- fix(public-repo): corregir paginación de drivers
- docs(admin-portal): actualizar README
- test(core-api): agregar tests de AuthService
- refactor(database): optimizar query de drivers
- chore(storage): actualizar configuración de Drive
```

### Tipos de Commit

| Tipo | Descripción |
|------|-------------|
| feat | Nueva funcionalidad |
| fix | Corrección de bug |
| docs | Documentación |
| refactor | Refactorización (sin cambio funcional) |
| test | Tests |
| chore | Mantenimiento |

### Fases del Proyecto

| Fase | Descripción |
|------|-------------|
| fase-1 | Estructura base (core-api) |
| fase-2 | Autenticación JWT |
| fase-3 | Proxy Google Drive |
| fase-4 | admin-portal |
| fase-5 | public-repo |

---

## 7. MODELO DE DATOS (Prisma)

### Esquema Actual

```prisma
model User {
  id           String     @id @default(cuid())
  username     String     @unique
  passwordHash String
  role         UserRole
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  drivers      HardwareDriver[]

  @@map("users")
}

model HardwareDriver {
  id            Int       @id @default(autoincrement())
  driverName    String
  brand         String
  model         String
  version       String
  hardwareType  HardwareType
  driveFileId   String
  fileExtension String
  fileSize      Int
  uploadedById  String
  uploadedBy    User      @relation(fields: [uploadedById], references: [id])
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@map("hardware_drivers")
}

enum UserRole {
  ADMIN_SISTEMAS
  SOPORTE_WP
  CONSULTA
}

enum HardwareType {
  IMPRESORA
  ESCANER
  TARJETA_RED
  USB
  DISCO_DURO
  OPTICO
  OTRO
}
```

---

## 8. FLUJO DE DATOS

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│  admin-portal  │────▶│   core-api     │────▶│  PostgreSQL    │
│                │     │                │     │    (Prisma)    │
└────────────────┘     └────────┬───────┘     └────────────────┘
                                 │
                                 ▼
                        ┌────────────────┐
                        │ Google Drive   │
                        │   (Storage)    │
                        └────────────────┘

┌────────────────┐     ┌────────────────┐
│  public-repo   │────▶│   core-api     │
│                │     │  (solo lectura)│
└────────────────┘     └────────────────┘
```

### Operaciones

1. **Carga (Admin)**: admin-portal → Stream → core-api → Google Drive
2. **Búsqueda (Público)**: public-repo → fetch → core-api → PostgreSQL
3. **Descarga (Público)**: core-api hace proxy del stream de Drive

---

## 9. PALETA DE COLORES (Diseño)

| Color | Hex | Variable | Uso |
|-------|-----|----------|-----|
| Rojo Primario | `#EA0B2A` | `brand-red` | Botones, logo, acentos |
| Fondo Principal | `#FFFCFD` | `app-bg` | Fondo general |
| Negro Profundo | `#000000` | `text-main` | Títulos |
| Gris Soporte | `#6B7280` | `text-muted` | Textos secundarios |
| Gris Borde | `#E5E7EB` | `border-soft` | Divisores |
| Blanco Puro | `#FFFFFF` | `card-bg` | Tarjetas |

---

## 10. DOCUMENTACIÓN DE REFERENCIA

### Skills Disponibles

Antes de modificar código, **OBLIGATORIO** revisar el skill correspondiente:

| Skill | Ubicación | Uso para |
|-------|-----------|----------|
| boxito-backend-api | `docs/skills/boxito-backend-api.md` | Modificar core-api |
| boxito-admin-frontend | `docs/skills/boxito-admin-frontend.md` | Modificar admin-portal |
| boxito-public-frontend | `docs/skills/boxito-public-frontend.md` | Modificar public-repo |
| boxito-database | `docs/skills/boxito-database.md` | Cambios en Prisma/schema |
| boxito-storage | `docs/skills/boxito-storage.md` | Cambios en almacenamiento |

### Estructura del Proyecto

```
repositorio-drivers/
├── packages/
│   ├── core-api/           # API REST (Fastify)
│   ├── admin-portal/       # Panel admin (Next.js)
│   └── public-repo/        # Repositorio público (Next.js)
├── docs/
│   ├── skills/             # Skills de referencia
│   └── ...
├── prompt-maestro.md       # Este documento
└── README.md
```

---

## 11. VALIDACIÓN DE IMPLEMENTACIÓN

Antes de cada commit, verificar:

- [ ] Tests pasan (`npm test`)
- [ ] Linting pasa (`npm run lint` si existe)
- [ ] No hay console.log() en producción
- [ ] Variables de entorno en .env (no hardcodeadas)
- [ ] Nuevos archivos importados correctamente
- [ ] Commits siguen formato conventional

---

## Resumen: Antes de Codificar

```
1️⃣  Leer prompt-maestro.md
2️⃣  Revisar skill relacionado
3️⃣  Crear plan por escrito
4️⃣  Obtener aprobación
5️⃣  Implementar con SOLID
6️⃣  Agregar tests
7️⃣  Verificar funcionamiento
8️⃣  Commit con formato correcto
```

---

**NOTA:** Este prompt debe actualizarse cuando se agreguen nuevas tecnologías o procesos al proyecto. Cualquier cambio debe seguir el mismo flujo de planificación establecido.