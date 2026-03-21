Prompt: Sistema de Repositorio de Drivers "Boxito" - Arquitectura Triple Capa
Contexto:
Actúa como un Arquitecto de Software Senior y Experto en Ciberseguridad. Vamos a construir desde cero el "Repositorio de Drivers Boxito". El sistema debe seguir una Arquitectura de Triple Capa (Capa de Datos, Capa de Gestión y Capa Pública) para garantizar que los secretos (DB y Google Drive) nunca estén expuestos en los servidores de interfaz.

Objetivos Principales:

Seguridad Zero Trust: Solo el core-api tiene acceso a PostgreSQL (Prisma) y Google Drive.

SOLID & Clean Code: Uso estricto de patrones de diseño (Repository, Service, Singleton).

Vibe Coding: Código intuitivo, modular y altamente mantenible.

Desacoplamiento Total: Los Dashboards consumen el Core mediante fetch de servidor a servidor con rotación de API Keys.

1. Estructura del Proyecto (Monorepo)
Crea la siguiente estructura de carpetas:

/packages/core-api: Node.js (Fastify o Next.js API-only). Poseedor de .env.

/packages/admin-portal: Next.js + Tailwind. Interfaz de gestión (Carga/Usuarios).

/packages/public-repo: Next.js + Tailwind. Interfaz de búsqueda y descarga (Ligera).

2. Stack Tecnológico & Seguridad
Lenguaje: TypeScript (Estricto).

Base de Datos: PostgreSQL + Prisma ORM.

Auth: Bcryptjs para passwordHash. JWT para comunicación entre capas.

Storage: Google Drive API (v3) gestionado mediante Streams para no saturar memoria.

Componentes: React con Atomic Design y Tailwind CSS.

3. Definición del Modelo (Prisma)
El esquema debe contener:

User: id (CUID), username (unique), passwordHash, role. (Sin campo 'name' por requerimiento).

HardwareDriver: id (Int), driverName, brand, model, version, hardwareType, driveFileId, fileExtension, fileSize, uploadedById, createdAt.

4. Reglas de Implementación (SOLID)
Single Responsibility: Los componentes de UI solo renderizan. La lógica de negocio vive en services.

Open/Closed: El sistema de almacenamiento debe ser una interfaz IStorage para permitir cambiar Google Drive por S3 en el futuro.

Interface Segregation: Los Dashboards solo reciben los datos exactos que necesitan.

5. Lógica de Flujo de Datos
Carga (Admin): admin-portal -> Stream -> core-api -> Google Drive.

Búsqueda (Público): public-repo -> fetch -> core-api -> PostgreSQL.

Descarga (Público): El core-api actúa como proxy (Pasamanos) enviando el stream de Drive al public-repo para ocultar la URL real de Google.

Instrucciones de Inicio:
Empecemos con la Fase 1: El Núcleo (core-api).

Genera el archivo schema.prisma basado en las definiciones anteriores.

Crea la lógica de encriptación de contraseñas (PasswordHasher).

Define la interfaz IDriverRepository y su implementación con Prisma.

Crea el script de seed.ts para los usuarios admin_sistemas y soporte_wp.

¿Por qué este prompt es efectivo?
Establece Fronteras: Define qué sabe cada servidor y qué no (evita que la IA intente meter Prisma en el servidor público).

Fuerza Calidad: Al mencionar SOLID y Clean Code, la IA evitará escribir funciones gigantes y preferirá clases y métodos pequeños.

Seguridad Nativa: Incluye el manejo de passwordHash y el flujo de Streams para archivos grandes (128MB+).