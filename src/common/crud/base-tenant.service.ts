import { NotFoundException } from '@nestjs/common';
import {
  paginate,
  PaginateExtra,
  type PaginationQuery,
  type Paginated,
} from '../pagination/paginate';
import { TenantService } from '../../modules/uth/tenant.service';
import {
  softDeleteTenantEntity,
  restoreTenantEntity,
  type TenantDelegate,
} from './tenant-crud.util';

export interface PrismaTenantDelegate<TModel> extends TenantDelegate {
  findMany: (args?: any) => Promise<TModel[]>;
  count: (args?: any) => Promise<number>;
  findFirst: (args?: any) => Promise<TModel | null>;
  findUnique?: (args?: any) => Promise<TModel | null>;
  create: (args: any) => Promise<TModel>;
}

export interface BaseTenantServiceOptions {
  entityName: string;
  gender?: 'm' | 'f';
  tenantField?: string | null;      // null para modelos globales sin tenant
  pkField?: string;                 // default: 'id' (ej: 'paquete_id', 'user_id', 'codigo')
  pkType?: 'string' | 'number';     // default: 'string' (para autoincrement: 'number')
  hardDelete?: boolean;             // default: false (true para DELETE físico)
  select?: Record<string, boolean>;
  buildWhere?: (filter: Record<string, unknown>) => Record<string, unknown>;
  buildOrderBy?: (filter: Record<string, unknown>) => Record<string, unknown>;
}

export abstract class BaseTenantService<
  TModel = unknown,
  TCreateDto = Record<string, unknown>,
  TUpdateDto = Record<string, unknown>,
> {
  protected readonly entityName: string;
  protected readonly gender: 'm' | 'f';
  protected readonly tenantField: string | null;
  protected readonly pkField: string;
  protected readonly pkType: 'string' | 'number';
  protected readonly hardDelete: boolean;
  protected readonly tenant: TenantService;

  constructor(
    protected readonly delegate: PrismaTenantDelegate<TModel>,
    tenant: TenantService | null,
    protected readonly options: BaseTenantServiceOptions,
  ) {
    this.entityName = options.entityName;
    this.gender = options.gender ?? 'm';
    this.tenantField = options.tenantField !== undefined ? options.tenantField : 'organizacion_id';
    this.pkField = options.pkField ?? 'id';
    this.pkType = options.pkType ?? 'string';
    this.hardDelete = options.hardDelete ?? false;
    this.tenant = tenant as TenantService;
  }

  get tenantId(): string {
    return this.tenant ? this.tenant.organizacion_id : '';
  }

  protected parseId(id: string | number): any {
    return this.pkType === 'number' ? Number(id) : String(id);
  }

  protected getWhereTenant(
    extraWhere: Record<string, unknown> = {},
  ): Record<string, unknown> {
    if (!this.tenantField || !this.tenant) {
      return extraWhere;
    }
    if (
      this.tenantField in extraWhere &&
      extraWhere[this.tenantField] !== this.tenantId
    ) {
      return {
        ...extraWhere,
        AND: [
          { [this.tenantField]: this.tenantId },
          { [this.tenantField]: extraWhere[this.tenantField] },
        ],
      };
    }
    return {
      ...extraWhere,
      [this.tenantField]: this.tenantId,
    };
  }

  list = async (
    query: PaginationQuery,
    filter: Record<string, unknown> = {},
  ): Promise<Paginated<TModel>> => {
    const filterWhere = this.options.buildWhere
      ? this.options.buildWhere(filter)
      : {};
    const where = this.getWhereTenant(filterWhere);
    const extra: PaginateExtra = {
      where,
      orderBy: this.options.buildOrderBy
        ? this.options.buildOrderBy(filter)
        : undefined,
    };
    return paginate(this.delegate, query, extra);
  };

  detail = async (id: string | number): Promise<TModel> => {
    const term = this.gender === 'f' ? 'no encontrada' : 'no encontrado';
    const parsedId = this.parseId(id);
    if (this.tenantField === this.pkField && parsedId !== this.tenantId) {
      throw new NotFoundException(`${this.entityName} con id "${id}" ${term}`);
    }
    const record = await this.delegate.findFirst({
      where: this.getWhereTenant({ [this.pkField]: parsedId }),
      ...(this.options.select ? { select: this.options.select } : {}),
    });
    if (!record) {
      throw new NotFoundException(`${this.entityName} con id "${id}" ${term}`);
    }
    return record;
  };

  create = async (
    dto: TCreateDto,
    extraData: Record<string, unknown> = {},
  ): Promise<TModel> => {
    const data: Record<string, unknown> = {
      ...(dto as Record<string, unknown>),
      ...extraData,
    };
    if (this.tenantField && this.tenant) {
      data[this.tenantField] = this.tenantId;
    }
    return this.delegate.create({ data });
  };

  update = async (id: string | number, dto: TUpdateDto): Promise<TModel | null> => {
    const term = this.gender === 'f' ? 'no encontrada' : 'no encontrado';
    const parsedId = this.parseId(id);
    if (this.tenantField === this.pkField && parsedId !== this.tenantId) {
      throw new NotFoundException(`${this.entityName} con id "${id}" ${term}`);
    }
    const whereCondition: Record<string, unknown> = { [this.pkField]: parsedId };
    if (!this.hardDelete) {
      whereCondition.deleted_at = null;
    }
    const result = await this.delegate.updateMany({
      where: this.getWhereTenant(whereCondition),
      data: dto as Record<string, unknown>,
    });
    if (result.count === 0) {
      throw new NotFoundException(`${this.entityName} con id "${id}" ${term}`);
    }
    return this.delegate.findFirst({
      where: this.getWhereTenant({ [this.pkField]: parsedId }),
      ...(this.options.select ? { select: this.options.select } : {}),
    });
  };

  delete = async (id: string | number): Promise<{ message: string }> => {
    const parsedId = this.parseId(id);
    if (this.hardDelete) {
      await this.delegate.deleteMany?.({
        where: this.getWhereTenant({ [this.pkField]: parsedId }),
      });
      const term = this.gender === 'f' ? 'eliminada' : 'eliminado';
      return { message: `${this.entityName} ${term} correctamente` };
    }
    return softDeleteTenantEntity(
      this.delegate,
      parsedId,
      this.tenantId,
      this.entityName,
      this.gender,
      this.tenantField ?? undefined,
      this.pkField,
    );
  };

  restore = async (id: string | number): Promise<{ message: string }> => {
    const parsedId = this.parseId(id);
    return restoreTenantEntity(
      this.delegate,
      parsedId,
      this.tenantId,
      this.entityName,
      this.gender,
      this.tenantField ?? undefined,
      this.pkField,
    );
  };
}
