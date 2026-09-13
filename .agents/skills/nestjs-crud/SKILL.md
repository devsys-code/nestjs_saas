---
name: nestjs-crud
description: >-
  Genera módulos CRUD completos y repetitivos en NestJS con Prisma, soporte para multi-tenancy,
  claves primarias UUID/autoincrement, registros dobles en transacciones ($transaction),
  registro masivo, agregaciones estadísticas y contratos de handoff en Markdown para el Frontend.
  Trigger cuando el usuario solicite crear módulos, entidades o APIs en NestJS siguiendo el estándar de Task.
---

# NestJS CRUD Generator & Automation Skill

Este skill automatiza de manera integral, repetitiva y estandarizada la creación de módulos CRUD completos para el backend NestJS (`bck/`), replicando con fidelidad la arquitectura canónica de `bck/src/modules/tsk/` y `bck/prisma/models/tsk/task.prisma`.

---

## 1. Cuadro de Referencia Rápida

| Componente | Ubicación en el Proyecto | Hereda / Extiende | Propósito |
| :--- | :--- | :--- | :--- |
| **Prisma Model** | `bck/prisma/models/<cat_3>/<entidad>.prisma` | — | Definición de tabla, índices, enums y relación tenant |
| **DTOs** | `bck/src/modules/<cat_3>/<sub_3>/<sub_3>.dto.ts` | — | Validación con `class-validator` y Swagger |
| **Filtros** | `bck/src/modules/<cat_3>/<sub_3>/<sub_3>.filter.ts` | `BaseFilterDto` | Filtros dinámicos con metadatos decorados |
| **Servicio** | `bck/src/modules/<cat_3>/<sub_3>/<sub_3>.service.ts` | `BaseTenantService` | Lógica de negocio, aislamiento tenant y transacciones |
| **Controlador** | `bck/src/modules/<cat_3>/<sub_3>/<sub_3>.controller.ts` | `createTenantController` | Endpoints canónicos y personalizados con Swagger |
| **Módulo** | `bck/src/modules/<cat_3>/<sub_3>/<sub_3>.module.ts` | — | Módulo NestJS con inyección limpia |
| **App Central** | `bck/src/app.module.ts` | — | Registro del módulo en el pipeline de la app |

---

## 2. Entradas Requeridas del Desarrollador

Cuando se invoque este skill, el usuario o agente debe suministrar los siguientes parámetros:

```markdown
- Entidad: [Ej: Paquete / Persona]
- Plural: [Ej: Paquetes / Personas]
- Género Gramatical: ['m' | 'f'] (para mensajes canónicos "creado/creada")
- Carpeta (Regla de 3 letras): [Ej: log/paq o usr/per o tsk]
- Clave Primaria: [uuid (default) | autoincrement | custom_name (ej: user_id)]
- Multi-Tenant: [true (default) | false]
- Atributos:
  - nombre_campo: tipo, constraints (required/optional, unique, default, min/max)
- Relaciones: [ej: N:1 con Organizacion, 1:1 con User]
- Casos Especiales:
  - Registro Doble / Transaccional: [si/no - modelo secundario]
  - Registro Masivo: [si/no]
  - Endpoints Estadísticos: [si/no]
```

---

## 3. Protocolo de Ejecución Paso a Paso

### Paso 1: Generar Modelo Prisma (`bck/prisma/models/<cat_3>/<entidad_snake>.prisma`)
1. Mapear nombre físico de tabla con `@@map("<Entidad>")`.
2. Clave primaria:
   - UUID: `id String @id @default(uuid())`
   - Autoincrement: `id Int @id @default(autoincrement())`
   - Custom: `<custom_name> String/Int @id ...`
3. Campo multi-tenant:
   - Si `multiTenant == true`:
     ```prisma
     organizacion_id String
     organizacion    Organizacion @relation(fields: [organizacion_id], references: [id])
     ```
4. Campos de auditoría canónicos obligatorios:
   ```prisma
   is_active  Boolean   @default(true)
   created_at DateTime  @default(now())
   updated_at DateTime  @updatedAt
   deleted_at DateTime?
   ```

### Paso 2: Generar DTOs (`bck/src/modules/<cat_3>/<sub_3>/<sub_3>.dto.ts`)
1. `Create<Entity>Dto`:
   - Validadores estrictos de `class-validator`: `@IsString()`, `@IsNotEmpty()`, `@MaxLength()`, `@IsOptional()`, `@IsEnum()`, `@IsNumber()`.
   - Decoradores de Swagger: `@ApiProperty()` y `@ApiPropertyOptional()` con ejemplos descriptivos.
2. `Update<Entity>Dto`:
   - Todas las propiedades como opcionales (`@IsOptional()` y `@ApiPropertyOptional()`).
3. Si `registroMasivo == true`:
   - `BulkCreate<Entity>Dto` con arreglo validado: `@IsArray()`, `@ValidateNested({ each: true })`, `@Type(() => Create<Entity>Dto)`.

### Paso 3: Generar Filtros (`bck/src/modules/<cat_3>/<sub_3>/<sub_3>.filter.ts`)
1. Extender `BaseFilterDto` importado de `../../common/filter`.
2. Decorar propiedades de filtro:
   - `@SearchFilter(['campo1', 'campo2'])`
   - `@TextFilter()` para búsquedas parciales
   - `@EnumFilter()` para listas cerradas
   - `@OrderByFilter(['id', 'campo1', 'created_at', ...], 'created_at')`
3. Exportar las funciones de mapeo:
   - `build<Entity>Where = (filter: <Entity>FilterDto) => buildWhereFromMetadata(filter, <Entity>FilterDto)`
   - `build<Entity>OrderBy = (filter: <Entity>FilterDto) => buildOrderByFromMetadata(filter, <Entity>FilterDto)`

### Paso 4: Generar Servicio (`bck/src/modules/<cat_3>/<sub_3>/<sub_3>.service.ts`)
1. Heredar de `BaseTenantService<TModel, CreateDto, UpdateDto>` (o `BaseService` si es no-tenant).
2. Constructor pasa: `prisma.<modelo>`, `tenantService`, y opciones con `entityName`, `gender`, `buildWhere`, `buildOrderBy`, y `select` (si se excluyen campos sensibles como contraseñas).
3. **Manejo de Transacciones (Registro Doble):**
   - Si se crean dos entidades simultáneamente (ej: Persona y Usuario), sobrescribir `override create = async (dto) => { return this.prisma.$transaction(async (tx) => { ... }); }` y `override update`.
4. **Registro Masivo:**
   - Implementar método `createBulk(dtos: Create<Entity>Dto[])` con `this.prisma.<modelo>.createMany(...)`.
5. **Estadísticas:**
   - Métodos agregados usando `prisma.<modelo>.groupBy` o `count`.

### Paso 5: Generar Controlador (`bck/src/modules/<cat_3>/<sub_3>/<sub_3>.controller.ts`)
1. Heredar de `createTenantController({ entityName, createDto, updateDto, filterDto })`.
2. Configurar decoradores:
   - `@ApiTags('<Plural>')`
   - `@ApiBearerAuth()`
   - `@Controller('<slug>')`
3. Agregar endpoints adicionales decorados:
   - `@Post('bulk')`
   - `@Get('stats/status')`
   - `@Get('stats/monthly')`

### Paso 6: Generar Módulo (`bck/src/modules/<cat_3>/<sub_3>/<sub_3>.module.ts`)
- `@Module({ imports: [PrismaModule, TenantModule], providers: [<Sub3>Service], controllers: [<Sub3>Controller], exports: [<Sub3>Service] })`.

### Paso 7: Registro Automático en `bck/src/app.module.ts`
- Importar `<Sub3>Module` y agregarlo en el arreglo `imports` de `AppModule`.

### Paso 8: Generación de Documentación y Contrato Handoff
1. **Documentación Backend:** `doc/backend/<sub_3>_backend.md` (Diagrama Mermaid, tabla de endpoints, cURL).
2. **Contrato Handoff para Frontend:** `doc/contracts/<sub_3>_frontend_handoff.md` (Interfaces TypeScript, filtros soportados, payload schemas).

---

## 4. Auditoría y Directrices [NestJS Doctor](https://www.nestjs.doctor/)

- **Evitar Inyecciones Circulares:** Usar `forwardRef()` únicamente en casos estrictamente indispensables.
- **DTO Validation:** Todo controlador debe validar entradas sin permitir propiedades arbitrarias no tipadas.
- **Transacciones Seguras:** En transacciones Prisma, asegurar que todas las operaciones de escritura usen el cliente transaccional `tx` en lugar de `this.prisma`.

---

## 5. Referencias y Guías Detalladas

- Consulta `references/patterns.md` para ver las plantillas de código completas.
- Consulta `references/advanced-cases.md` para casos de transacciones compuestas 1:1 y claves autoincrementables.
