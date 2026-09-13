---
name: nestjs-core
description: >-
  Genera la arquitectura base e infraestructura de backend en NestJS 11+ con Prisma 7 para sistemas SaaS multitenant desde cero, incluyendo BaseTenantService agnostico de tipo de PK (UUID o numero), utilitarios de tenant, esquemas Prisma para Organizacion y Usuario, autenticacion JWT con Guards y roles, y modulo de respuesta API estandarizada. Trigger cuando se solicite inicializar, configurar o generar la base o core de un backend NestJS SaaS desde cero.
---

# NestJS 11+ SaaS Core Skill

Esta skill genera y estandariza la **capa de infraestructura y arquitectura base** para proyectos backend en NestJS 11+ con Prisma 7, PostgreSQL y Fastify/Express, sin generar entidades de negocio (que corresponden a `nestjs-crud`).

---

## 1. Responsabilidades de la Skill

Al ejecutarse en un proyecto nuevo o existente, garantiza que el backend cuente con:
1. **Servicio Genérico Multitenant** (`src/common/crud/base-tenant.service.ts`):
   - Soporte para PK de tipo `string` (UUID) o `number` (Int/BigInt autoincremental).
   - Soporte para modelos globales (`tenantField: null`).
   - Soporte para Soft Delete o Hard Delete configurable.
   - Manejo automático de `$transaction` para operaciones atómicas.
2. **Utilitarios Multitenant** (`src/common/crud/tenant-crud.util.ts`):
   - Generación de filtros `where` inyectando automáticamente el `organizacionId`.
3. **Esquemas Prisma Fundacionales**:
   - `Organizacion`: ID UUID, nombre, slug, timestamps, deletedAt.
   - `User`: ID UUID, email, nombre, password (hasheado con bcrypt), role (`admin`, `member`, `viewer`), FK a `Organizacion`.
4. **Módulos Core SaaS**:
   - `auth`: Módulo JWT (`/api/v1/auth/login`, `/api/v1/auth/me`), decoradores `@CurrentUser()`, `@Roles()`, y guards `JwtAuthGuard` y `RolesGuard`.
   - `org`: CRUD de organizaciones para administración global.
   - `usr`: CRUD de usuarios filtrados por tenant con asignación de roles.
5. **Estandarización de Respuestas**:
   - Interceptor o formato de respuesta compatible con Frontends: `{ data: T, meta: { total, page, limit } }`.

---

## 2. Protocolo de Ejecución Paso a Paso

### Paso 1: Estructura de Directorios
Verificar o crear la estructura estándar:
```text
bck/
├── prisma/
│   ├── schema.prisma
│   └── models/
│       ├── org/organizacion.prisma
│       └── usr/user.prisma
├── src/
│   ├── common/
│   │   ├── crud/
│   │   │   ├── base-tenant.service.ts
│   │   │   └── tenant-crud.util.ts
│   │   ├── decorators/
│   │   ├── guards/
│   │   └── interceptors/
│   └── modules/
│       ├── auth/
│       ├── org/
│       └── usr/
├── package.json
└── tsconfig.json
```

### Paso 2: Generar Utilitarios de Infraestructura (`common/crud/`)
Consultar el archivo de referencia `references/core-architecture.md` para implementar:
- `base-tenant.service.ts`
- `tenant-crud.util.ts`

### Paso 3: Generar Esquemas Prisma Fundacionales
- `organizacion.prisma` y `user.prisma`.
- Ejecutar `npx prisma generate`.

### Paso 4: Generar Módulos Core SaaS
- `auth`: Login, JWT strategy, JwtAuthGuard.
- `org`: Servicio y Controlador de Organización.
- `usr`: Servicio y Controlador de Usuario.

### Paso 5: Verificación
Ejecutar:
```powershell
npm run build
```

---

## 3. Contrato de Salida para Frontend (Interoperable)

- **Login Response (`/api/v1/auth/login`)**:
  ```json
  {
    "access": "jwt_token_here",
    "refresh": "refresh_token_here",
    "user": {
      "id": "uuid",
      "email": "user@org.com",
      "name": "Juan Perez",
      "role": "admin",
      "organizacion": {
        "id": "uuid-org",
        "name": "Mi Empresa",
        "slug": "mi-empresa"
      }
    }
  }
  ```
- **Listados (`/api/v1/<recurso>`)**:
  ```json
  {
    "data": [ ... ],
    "meta": {
      "total": 42,
      "page": 1,
      "limit": 10
    }
  }
  ```
