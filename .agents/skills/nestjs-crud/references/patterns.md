# Patrones de Código Canónicos para NestJS CRUD

## 1. Plantillas de Modelos Prisma

### A. Modelo con UUID (Estándar Task)
```prisma
model {{Entity}} {
  id              String         @id @default(uuid())
  organizacion_id String
  is_active       Boolean        @default(true)
  created_at      DateTime       @default(now())
  updated_at      DateTime       @updatedAt
  deleted_at      DateTime?

  organizacion Organizacion @relation(fields: [organizacion_id], references: [id])
  @@map("{{Entity}}")
}
```

### B. Modelo con Autoincrement (Estándar Paquete FastCargo)
```prisma
model {{Entity}} {
  id              Int            @id @default(autoincrement())
  organizacion_id String
  tracking1       String
  is_active       Boolean        @default(true)
  created_at      DateTime       @default(now())
  updated_at      DateTime       @updatedAt
  deleted_at      DateTime?

  organizacion Organizacion @relation(fields: [organizacion_id], references: [id])
  @@map("{{Entity}}")
}
```

### C. Modelo con Shared PK (Estándar Declaracion FastCargo 1:1)
```prisma
model {{Entity}} {
  paquete_id      Int            @id
  organizacion_id String
  valor           Float          @default(0)
  is_active       Boolean        @default(true)
  created_at      DateTime       @default(now())
  updated_at      DateTime       @updatedAt
  deleted_at      DateTime?

  paquete      Paquete      @relation(fields: [paquete_id], references: [id], onDelete: Cascade)
  organizacion Organizacion @relation(fields: [organizacion_id], references: [id])
  @@map("{{Entity}}")
}
```

### D. Modelo Global Sin Tenant (Estándar FaseCns / País)
```prisma
model {{Entity}} {
  id          Int            @id @default(autoincrement())
  codigo      String         @unique
  nombre      String
  is_active   Boolean        @default(true)
  created_at  DateTime       @default(now())
  updated_at  DateTime       @updatedAt
  deleted_at  DateTime?

  @@map("{{Entity}}")
}
```

## 2. Plantilla de Controlador

```typescript
import { Controller } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { createTenantController } from '../../common/crud/tenant-crud.controller';
import { {{Sub3}}Service } from './{{sub_3}}.service';
import { Create{{Entity}}Dto, Update{{Entity}}Dto } from './{{sub_3}}.dto';
import { {{Entity}}FilterDto } from './{{sub_3}}.filter';

@ApiTags('{{Plural}}')
@ApiBearerAuth()
@Controller('{{slug}}')
export class {{Sub3}}Controller extends createTenantController({
  entityName: '{{Entity}}',
  createDto: Create{{Entity}}Dto,
  updateDto: Update{{Entity}}Dto,
  filterDto: {{Entity}}FilterDto,
}) {
  constructor(public readonly {{sub_3}}Service: {{Sub3}}Service) {
    super({{sub_3}}Service);
  }
}
```

## 3. Plantilla de Servicio

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantService } from '../uth/tenant.service';
import { BaseTenantService } from '../../common/crud/base-tenant.service';
import { build{{Entity}}Where, build{{Entity}}OrderBy } from './{{sub_3}}.filter';
import { Create{{Entity}}Dto, Update{{Entity}}Dto } from './{{sub_3}}.dto';
import type { {{Entity}}Model } from '../../../generated/prisma/models';

@Injectable()
export class {{Sub3}}Service extends BaseTenantService<
  {{Entity}}Model,
  Create{{Entity}}Dto,
  Update{{Entity}}Dto
> {
  constructor(prisma: PrismaService, tenant: TenantService) {
    super(prisma.{{entity_camel}}, tenant, {
      entityName: '{{Entity}}',
      gender: '{{gender}}',
      buildWhere: build{{Entity}}Where,
      buildOrderBy: build{{Entity}}OrderBy,
    });
  }
}
```
