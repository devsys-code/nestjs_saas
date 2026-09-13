# Suite Completa de Infraestructura (`common/` & `auth/`) - NestJS 11+ & Prisma 7

Este documento contiene la implementación canónica y completa de todos los archivos de infraestructura de `common/` y `auth/` para NestJS 11+.

---

## 1. `common/pagination/paginate.ts`
```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface Paginated<T> {
  count: number;
  page: number;
  size: number;
  next: number | null;
  previous: number | null;
  first: number | null;
  last: number | null;
  results: T[];
}

export interface PaginationQuery {
  page: number;
  size: number;
}

export interface PaginateExtra {
  where?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
}

export const Paginado = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): PaginationQuery => {
    const query = ctx
      .switchToHttp()
      .getRequest<{ query: Record<string, string> }>().query;
    return {
      page: Math.max(parseInt(query.page, 10) || 1, 1),
      size: Math.max(parseInt(query.size, 10) || 0, 0),
    };
  },
);

interface PrismaDelegate {
  findMany: (args?: any) => Promise<unknown[]>;
  count: (args?: any) => Promise<number>;
}

export const paginate = async <T>(
  delegate: PrismaDelegate,
  query: PaginationQuery,
  extra?: PaginateExtra,
): Promise<Paginated<T>> => {
  const take = query.size > 0 ? query.size : undefined;
  const skip = take ? (query.page - 1) * take : 0;

  const countArgs = extra?.where ? { where: extra.where } : undefined;
  const findManyArgs: Record<string, unknown> = {
    skip,
    ...(extra?.where ? { where: extra.where } : {}),
    ...(extra?.orderBy ? { orderBy: extra.orderBy } : {}),
    ...(take ? { take } : {}),
  };

  const [count, results] = await Promise.all([
    delegate.count(countArgs),
    delegate.findMany(findManyArgs),
  ]);

  const first = count > 0 ? 1 : null;
  const last = take && count > 0 ? Math.ceil(count / take) : null;

  return {
    count,
    page: query.page,
    size: query.size,
    first,
    last,
    next: last && query.page < last ? query.page + 1 : null,
    previous: query.page > 1 ? query.page - 1 : null,
    results: results as T[],
  };
};
```

---

## 2. `common/filter/all-exceptions.filter.ts`
```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<{
      status: (code: number) => { send: (body: unknown) => void };
    }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Error interno del servidor';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message =
        typeof res === 'string'
          ? res
          : ((res as { message?: string | string[] }).message ?? message);
    } else if (
      exception &&
      typeof exception === 'object' &&
      'code' in exception &&
      typeof exception.code === 'string'
    ) {
      const prismaCode = (exception as { code: string }).code;
      if (prismaCode === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'Conflicto: ya existe un registro con esos datos únicos';
      } else if (prismaCode === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'El registro solicitado no fue encontrado';
      } else if (prismaCode === 'P2003') {
        status = HttpStatus.BAD_REQUEST;
        message = 'Restricción de relación no cumplida';
      }
    }

    response.status(status).send({ statusCode: status, message });
  }
}
```

---

## 3. `common/filter/base-filter.dto.ts`
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsIn, IsDateString, IsString } from 'class-validator';
import {
  MultiIdFilter,
  BooleanFilter,
  DateRangeFilter,
} from './filter.decorators';

export class BaseFilterDto {
  [key: string]: unknown;

  @ApiProperty({ required: false, type: String, description: 'Page number' })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiProperty({ required: false, type: String, description: 'Page size (0 = all)' })
  @IsOptional()
  @IsString()
  size?: string;

  @MultiIdFilter()
  id?: string;

  @BooleanFilter({ description: 'Filter by active status' })
  is_active?: boolean;

  @DateRangeFilter({ description: 'Filter by creation date (YYYY-MM-DD)' })
  created_at?: string;

  @IsOptional()
  @IsDateString()
  created_at_gte?: string;

  @IsOptional()
  @IsDateString()
  created_at_lte?: string;

  @DateRangeFilter({ description: 'Filter by update date' })
  updated_at?: string;

  @IsOptional()
  @IsDateString()
  updated_at_gte?: string;

  @IsOptional()
  @IsDateString()
  updated_at_lte?: string;

  @DateRangeFilter({ description: 'Filter by deletion date' })
  deleted_at?: string;

  @IsOptional()
  @IsDateString()
  deleted_at_gte?: string;

  @IsOptional()
  @IsDateString()
  deleted_at_lte?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'order_dir debe ser: asc o desc' })
  order_dir?: 'asc' | 'desc';
}
```

---

## 4. `common/crud/tenant-crud.controller.ts`
```typescript
import {
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../modules/uth/jwt-auth.guard';
import { TenantGuard } from '../../modules/uth/tenant.guard';
import { TenantContext } from '../../common/decorators';
import { BaseTenantService } from './base-tenant.service';

@UseGuards(JwtAuthGuard, TenantGuard)
export abstract class TenantCrudController<
  TModel extends Record<string, any>,
  TCreateDto extends Record<string, any>,
  TUpdateDto extends Record<string, any>,
  TQueryDto extends Record<string, any> = Record<string, any>,
> {
  constructor(protected readonly service: BaseTenantService<TModel, TCreateDto, TUpdateDto, TQueryDto>) {}

  @Get()
  async findAll(@TenantContext('organizacionId') tenantId: string, @Query() query: TQueryDto) {
    return this.service.findAll(tenantId, query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @TenantContext('organizacionId') tenantId: string) {
    return this.service.findOne(id, tenantId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@TenantContext('organizacionId') tenantId: string, @Body() dto: TCreateDto) {
    return this.service.create(tenantId, dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @TenantContext('organizacionId') tenantId: string, @Body() dto: TUpdateDto) {
    return this.service.update(id, tenantId, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @TenantContext('organizacionId') tenantId: string) {
    return this.service.softDelete(id, tenantId);
  }
}
```

---

## 5. `modules/uth/jwt-auth.guard.ts` & `tenant.guard.ts`
```typescript
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new UnauthorizedException('Usuario no autenticado');
    if (!user.organizacionId) throw new ForbiddenException('Contexto de organización no identificado');
    return true;
  }
}
```
