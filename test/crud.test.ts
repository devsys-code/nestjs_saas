import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { paginate } from '../src/common/pagination/paginate';
import {
  softDeleteTenantEntity,
  restoreTenantEntity,
} from '../src/common/crud/tenant-crud.util';
import { NotFoundException } from '@nestjs/common';
import { createTenantController } from '../src/common/crud/tenant-crud.controller';
import { TaskFilterDto, buildTaskWhere } from '../src/modules/tsk/tsk.filter';

describe('Pagination Unit Tests', () => {
  it('should paginate items correctly with default page size', async () => {
    const fakeDelegate = {
      findMany: async () => [{ id: '1' }, { id: '2' }],
      count: async () => 20,
    };

    const result = await paginate(fakeDelegate, { page: 2, size: 2 });
    assert.equal(result.page, 2);
    assert.equal(result.size, 2);
    assert.equal(result.count, 20);
    assert.equal(result.first, 1);
    assert.equal(result.last, 10);
    assert.equal(result.next, 3);
    assert.equal(result.previous, 1);
    assert.equal(result.results.length, 2);
  });

  it('should disable pagination when size=0 is passed', async () => {
    const items = [{ id: '1' }, { id: '2' }, { id: '3' }];
    const fakeDelegate = {
      findMany: async () => items,
      count: async () => items.length,
    };

    const result = await paginate(fakeDelegate, { page: 1, size: 0 });
    assert.equal(result.page, 1);
    assert.equal(result.size, 0);
    assert.equal(result.count, 3);
    assert.equal(result.first, 1);
    assert.equal(result.last, null);
    assert.equal(result.results.length, 3);
  });

  it('should return null for first and last when count is 0', async () => {
    const fakeDelegate = {
      findMany: async () => [],
      count: async () => 0,
    };

    const result = await paginate(fakeDelegate, { page: 1, size: 10 });
    assert.equal(result.count, 0);
    assert.equal(result.first, null);
    assert.equal(result.last, null);
    assert.equal(result.next, null);
    assert.equal(result.previous, null);
    assert.equal(result.results.length, 0);
  });
});

describe('Date Range Filter Unit Tests', () => {
  it('should build AND date range when only _gte and _lte are passed', () => {
    const filter = new TaskFilterDto();
    filter.created_at_gte = '2026-09-01';
    filter.created_at_lte = '2026-09-02';

    const where = buildTaskWhere(filter);
    assert.ok(where.AND);
    const andArray = where.AND as Array<
      Record<string, { gte: Date; lte: Date }>
    >;
    assert.equal(andArray.length, 1);
    assert.ok(andArray[0].created_at);
    assert.equal(
      andArray[0].created_at.gte.toISOString(),
      '2026-09-01T00:00:00.000Z',
    );
    assert.equal(
      andArray[0].created_at.lte.toISOString(),
      '2026-09-02T23:59:59.999Z',
    );
  });
});

describe('Tenant CRUD Util Unit Tests', () => {
  it('softDeleteTenantEntity should succeed when entity exists', async () => {
    const fakeDelegate = {
      updateMany: async () => ({ count: 1 }),
    };

    const resFemale = await softDeleteTenantEntity(
      fakeDelegate,
      'org-123',
      'org-123',
      'Organización',
      'f',
      'id',
    );
    assert.equal(resFemale.message, 'Organización eliminada correctamente');

    const resMale = await softDeleteTenantEntity(
      fakeDelegate,
      'uuid-456',
      'org-123',
      'Usuario',
      'm',
      'organizacion_id',
    );
    assert.equal(resMale.message, 'Usuario eliminado correctamente');
  });

  it('softDeleteTenantEntity should throw NotFoundException when count is 0', async () => {
    const fakeDelegate = {
      updateMany: async () => ({ count: 0 }),
    };

    await assert.rejects(
      async () => {
        await softDeleteTenantEntity(
          fakeDelegate,
          'uuid-999',
          'org-123',
          'Tarea',
          'f',
        );
      },
      (err: unknown) => {
        assert(err instanceof NotFoundException);
        assert.equal(
          (err as NotFoundException).message,
          'Tarea con id "uuid-999" no encontrada',
        );
        return true;
      },
    );
  });

  it('restoreTenantEntity should succeed and return gendered message', async () => {
    const fakeDelegate = {
      updateMany: async () => ({ count: 1 }),
    };

    const res = await restoreTenantEntity(
      fakeDelegate,
      'uuid-123',
      'org-123',
      'Tarea',
      'f',
    );
    assert.equal(res.message, 'Tarea restaurada correctamente');
  });

  it('restoreTenantEntity should throw NotFoundException when count is 0', async () => {
    const fakeDelegate = {
      updateMany: async () => ({ count: 0 }),
    };

    await assert.rejects(
      async () => {
        await restoreTenantEntity(
          fakeDelegate,
          'uuid-999',
          'org-123',
          'Usuario',
          'm',
        );
      },
      (err: unknown) => {
        assert(err instanceof NotFoundException);
        assert.equal(
          (err as NotFoundException).message,
          'Usuario con id "uuid-999" no encontrado o no eliminado',
        );
        return true;
      },
    );
  });
});

describe('createTenantController Factory Tests', () => {
  it('should generate a controller host with standard CRUD methods', () => {
    class DummyDto {}
    const ControllerHost = createTenantController({
      entityName: 'Prueba',
      createDto: DummyDto,
      updateDto: DummyDto,
      filterDto: DummyDto,
    });

    assert.equal(typeof ControllerHost, 'function');
    const proto = ControllerHost.prototype;
    assert.equal(typeof proto.list, 'function');
    assert.equal(typeof proto.detail, 'function');
    assert.equal(typeof proto.create, 'function');
    assert.equal(typeof proto.update, 'function');
    assert.equal(typeof proto.delete, 'function');
    assert.equal(typeof proto.restore, 'function');
  });
});
