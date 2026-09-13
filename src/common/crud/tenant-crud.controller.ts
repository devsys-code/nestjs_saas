import {
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Type,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import {
  Paginado,
  type PaginationQuery,
  type Paginated,
} from '../pagination/paginate';
import { Roles } from '../decorators';

export interface ITenantCrudService<
  TModel = unknown,
  TCreateDto = unknown,
  TUpdateDto = unknown,
> {
  list: (
    query: PaginationQuery,
    filter: Record<string, unknown>,
  ) => Promise<Paginated<TModel>>;
  detail: (id: string) => Promise<TModel>;
  create: (dto: TCreateDto) => Promise<TModel>;
  update: (id: string, dto: TUpdateDto) => Promise<TModel | null>;
  delete: (id: string) => Promise<{ message: string }>;
  restore: (id: string) => Promise<{ message: string }>;
}

export interface TenantCrudControllerOptions<
  TCreateDto extends Type<unknown> = Type<unknown>,
  TUpdateDto extends Type<unknown> = Type<unknown>,
  TFilterDto extends Type<unknown> = Type<unknown>,
> {
  entityName: string;
  createDto?: TCreateDto;
  updateDto?: TUpdateDto;
  filterDto?: TFilterDto;
}

export function createTenantController<
  TModel = unknown,
  TCreateDto extends Type<unknown> = Type<unknown>,
  TUpdateDto extends Type<unknown> = Type<unknown>,
  TFilterDto extends Type<unknown> = Type<unknown>,
>(options: TenantCrudControllerOptions<TCreateDto, TUpdateDto, TFilterDto>) {
  const lower = options.entityName.toLowerCase();

  abstract class TenantCrudControllerHost {
    constructor(
      public readonly service: ITenantCrudService<
        TModel,
        InstanceType<TCreateDto>,
        InstanceType<TUpdateDto>
      >,
    ) {}

    @Get()
    @ApiOperation({ summary: `Listar ${lower}s de la organización` })
    async list(
      @Paginado() query: PaginationQuery,
      @Query() filter: InstanceType<TFilterDto>,
    ): Promise<Paginated<TModel>> {
      return await this.service.list(query, filter as Record<string, unknown>);
    }

    @Get('detail/:id')
    @ApiOperation({ summary: `Detalle de ${lower}` })
    async detail(@Param('id') id: string): Promise<TModel> {
      return await this.service.detail(id);
    }

    @Post('create')
    @ApiOperation({ summary: `Crear ${lower}` })
    @ApiResponse({ status: 201, description: `${options.entityName} creada/o` })
    @ApiBody({ type: options.createDto ?? Object })
    async create(@Body() dto: InstanceType<TCreateDto>): Promise<TModel> {
      return await this.service.create(dto);
    }

    @Patch('update/:id')
    @ApiOperation({ summary: `Actualizar ${lower}` })
    @ApiBody({ type: options.updateDto ?? Object })
    async update(
      @Param('id') id: string,
      @Body() dto: InstanceType<TUpdateDto>,
    ): Promise<TModel | null> {
      return await this.service.update(id, dto);
    }

    @Delete('delete/:id')
    @Roles('admin')
    @ApiOperation({ summary: `Eliminar ${lower} (soft delete)` })
    async delete(@Param('id') id: string): Promise<{ message: string }> {
      return await this.service.delete(id);
    }

    @Patch('restore/:id')
    @Roles('admin')
    @ApiOperation({ summary: `Restaurar ${lower}` })
    async restore(@Param('id') id: string): Promise<{ message: string }> {
      return await this.service.restore(id);
    }
  }

  return TenantCrudControllerHost;
}
