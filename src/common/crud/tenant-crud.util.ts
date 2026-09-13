import { NotFoundException } from '@nestjs/common';

export interface TenantDelegate {
  updateMany: (args: any) => Promise<{ count: number }>;
  deleteMany?: (args: any) => Promise<{ count: number }>;
}

export async function softDeleteTenantEntity(
  delegate: TenantDelegate,
  id: string | number,
  organizacion_id: string,
  entityName: string,
  gender: 'm' | 'f' = 'm',
  tenantField: string = 'organizacion_id',
  pkField: string = 'id',
): Promise<{ message: string }> {
  const term = gender === 'f' ? 'no encontrada' : 'no encontrado';
  if (tenantField === pkField && id !== organizacion_id) {
    throw new NotFoundException(`${entityName} con id "${id}" ${term}`);
  }
  const where: Record<string, unknown> = {
    [pkField]: id,
    deleted_at: null,
  };
  if (tenantField && tenantField !== pkField && organizacion_id) {
    where[tenantField] = organizacion_id;
  }
  const result = await delegate.updateMany({
    where,
    data: { deleted_at: new Date(), is_active: false },
  });
  if (result.count === 0) {
    throw new NotFoundException(`${entityName} con id "${id}" ${term}`);
  }
  const termElim = gender === 'f' ? 'eliminada' : 'eliminado';
  return { message: `${entityName} ${termElim} correctamente` };
}

export async function restoreTenantEntity(
  delegate: TenantDelegate,
  id: string | number,
  organizacion_id: string,
  entityName: string,
  gender: 'm' | 'f' = 'm',
  tenantField: string = 'organizacion_id',
  pkField: string = 'id',
): Promise<{ message: string }> {
  const term =
    gender === 'f'
      ? 'no encontrada o no eliminada'
      : 'no encontrado o no eliminado';
  if (tenantField === pkField && id !== organizacion_id) {
    throw new NotFoundException(`${entityName} con id "${id}" ${term}`);
  }
  const where: Record<string, unknown> = {
    [pkField]: id,
    deleted_at: { not: null },
  };
  if (tenantField && tenantField !== pkField && organizacion_id) {
    where[tenantField] = organizacion_id;
  }
  const result = await delegate.updateMany({
    where,
    data: { deleted_at: null, is_active: true },
  });
  if (result.count === 0) {
    throw new NotFoundException(`${entityName} con id "${id}" ${term}`);
  }
  const termRest = gender === 'f' ? 'restaurada' : 'restaurado';
  return { message: `${entityName} ${termRest} correctamente` };
}
