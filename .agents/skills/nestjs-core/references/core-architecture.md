# Código de Referencia Canónico: NestJS Core Architecture

## 1. `common/crud/base-tenant.service.ts`
```typescript
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  TenantBulkCreateResult,
  TenantBulkUpdateResult,
  TenantPaginationMeta,
  TenantPaginationResult,
} from './tenant-crud.types';

export interface BaseTenantServiceOptions {
  modelDelegateName: string;
  tenantField?: string | null;
  deletedAtField?: string;
  defaultOrderBy?: Record<string, 'asc' | 'desc'>;
  maxPageSize?: number;
  hardDelete?: boolean;
  pkField?: string;
  pkType?: 'string' | 'number';
}

@Injectable()
export abstract class BaseTenantService<
  TModel extends Record<string, any>,
  TCreateDto extends Record<string, any>,
  TUpdateDto extends Record<string, any>,
  TQueryDto extends Record<string, any> = Record<string, any>,
> {
  protected readonly modelDelegateName: string;
  protected readonly tenantField: string | null;
  protected readonly deletedAtField: string;
  protected readonly defaultOrderBy: Record<string, 'asc' | 'desc'>;
  protected readonly maxPageSize: number;
  protected readonly hardDelete: boolean;
  protected readonly pkField: string;
  protected readonly pkType: 'string' | 'number';

  constructor(
    protected readonly prisma: PrismaService,
    options: BaseTenantServiceOptions,
  ) {
    this.modelDelegateName = options.modelDelegateName;
    this.tenantField = options.tenantField !== undefined ? options.tenantField : 'organizacionId';
    this.deletedAtField = options.deletedAtField ?? 'deletedAt';
    this.defaultOrderBy = options.defaultOrderBy ?? { createdAt: 'desc' };
    this.maxPageSize = options.maxPageSize ?? 100;
    this.hardDelete = options.hardDelete ?? false;
    this.pkField = options.pkField ?? 'id';
    this.pkType = options.pkType ?? 'string';
  }

  protected parseId(id: string | number): any {
    if (this.pkType === 'number') {
      const parsed = typeof id === 'number' ? id : parseInt(id, 10);
      if (isNaN(parsed)) throw new BadRequestException(`ID inválido: ${id}`);
      return parsed;
    }
    return String(id);
  }

  protected getDelegate(tx?: any): any {
    const client = tx ?? this.prisma;
    const delegate = client[this.modelDelegateName];
    if (!delegate) throw new InternalServerErrorException(`Modelo ${this.modelDelegateName} no encontrado`);
    return delegate;
  }

  protected buildTenantScope(tenantId?: string | null): Record<string, any> {
    const scope: Record<string, any> = {};
    if (this.tenantField) {
      if (!tenantId) throw new ForbiddenException('Tenant no especificado');
      scope[this.tenantField] = tenantId;
    }
    if (!this.hardDelete && this.deletedAtField) {
      scope[this.deletedAtField] = null;
    }
    return scope;
  }

  async findAll(tenantId?: string | null, query?: TQueryDto): Promise<TenantPaginationResult<TModel>> {
    const delegate = this.getDelegate();
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(this.maxPageSize, Math.max(1, Number(query?.limit || query?.pageSize) || 10));
    const skip = (page - 1) * limit;

    const where = {
      ...this.buildTenantScope(tenantId),
      ...this.buildSearchFilter(query),
    };

    const [total, data] = await Promise.all([
      delegate.count({ where }),
      delegate.findMany({ where, skip, take: limit, orderBy: this.defaultOrderBy }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findOne(id: string | number, tenantId?: string | null): Promise<TModel> {
    const delegate = this.getDelegate();
    const parsedId = this.parseId(id);
    const where = {
      [this.pkField]: parsedId,
      ...this.buildTenantScope(tenantId),
    };

    const item = await delegate.findFirst({ where });
    if (!item) throw new NotFoundException(`Registro con ${this.pkField} ${id} no encontrado`);
    return item;
  }

  protected buildSearchFilter(query?: TQueryDto): Record<string, any> {
    return {};
  }
}
```

## 2. Esquemas Prisma Core (`prisma/models/`)

### `prisma/models/org/organizacion.prisma`
```prisma
model Organizacion {
  id        String    @id @default(uuid())
  name      String
  slug      String    @unique
  deletedAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  users     User[]

  @@map("Organizacion")
}
```

### `prisma/models/usr/user.prisma`
```prisma
model User {
  id             String        @id @default(uuid())
  email          String
  name           String
  password       String
  role           String        @default("member")
  organizacionId String
  organizacion   Organizacion  @relation(fields: [organizacionId], references: [id], onDelete: Cascade)
  deletedAt      DateTime?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  @@unique([organizacionId, email])
  @@map("User")
}
```
