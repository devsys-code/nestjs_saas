import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NotFoundException } from '@nestjs/common';
import { buildTaskWhere, buildTaskOrderBy, TaskFilterDto } from './tsk.filter';
import { TskService } from './tsk.service';

describe('Tsk Module - Filter Unit Tests', () => {
  it('buildTaskWhere should correctly parse status and search filters', () => {
    const filter = new TaskFilterDto();
    filter.status = 'green';
    const where = buildTaskWhere(filter);
    assert.deepEqual(where, { status: 'green', deleted_at: null });
  });

  it('buildTaskOrderBy should map order_by correctly', () => {
    const filter = new TaskFilterDto();
    filter.order_by = 'title';
    filter.order_dir = 'asc';
    const orderBy = buildTaskOrderBy(filter);
    assert.deepEqual(orderBy, { title: 'asc' });
  });
});

describe('Tsk Module - TskService Unit Tests', () => {
  it('create should auto-inject tenant organizacion_id', async () => {
    let capturedData: any = null;
    const fakePrisma = {
      task: {
        create: async (args: any) => {
          capturedData = args.data;
          return { id: 'task-1', ...args.data };
        },
      },
    };
    const fakeTenant = { organizacion_id: 'org-tenant-123' };
    const service = new TskService(fakePrisma as any, fakeTenant as any);

    const result = await service.create({
      title: 'New Task',
      description: 'Test description',
      status: 'yellow',
    });

    assert.equal(capturedData.organizacion_id, 'org-tenant-123');
    assert.equal(capturedData.title, 'New Task');
    assert.equal(result.id, 'task-1');
  });

  it('detail should throw canonical 404 with feminine gender (Tarea no encontrada)', async () => {
    const fakePrisma = {
      task: {
        findFirst: async () => null,
      },
    };
    const fakeTenant = { organizacion_id: 'org-tenant-123' };
    const service = new TskService(fakePrisma as any, fakeTenant as any);

    await assert.rejects(
      async () => {
        await service.detail('task-non-existent');
      },
      (err: unknown) => {
        assert(err instanceof NotFoundException);
        assert.equal(
          err.message,
          'Tarea con id "task-non-existent" no encontrada',
        );
        return true;
      },
    );
  });

  it('delete should soft delete task and return canonical message', async () => {
    const fakePrisma = {
      task: {
        updateMany: async () => ({ count: 1 }),
      },
    };
    const fakeTenant = { organizacion_id: 'org-tenant-123' };
    const service = new TskService(fakePrisma as any, fakeTenant as any);

    const result = await service.delete('task-123');
    assert.equal(result.message, 'Tarea eliminada correctamente');
  });
});
