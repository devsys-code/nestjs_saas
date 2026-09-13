import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { buildOrgWhere, buildOrgOrderBy, OrgFilterDto } from './org.filter';
import { OrgService } from './org.service';

describe('Org Module - Filter Unit Tests', () => {
  it('buildOrgWhere should correctly create Prisma where clause for text and search', () => {
    const filter = new OrgFilterDto();
    filter.name = 'Tech';
    const where = buildOrgWhere(filter);
    assert.deepEqual(where, {
      name: { contains: 'Tech', mode: 'insensitive' },
      deleted_at: null,
    });
  });

  it('buildOrgOrderBy should correctly create Prisma orderBy clause', () => {
    const filter = new OrgFilterDto();
    filter.order_by = 'name';
    const orderBy = buildOrgOrderBy(filter);
    assert.deepEqual(orderBy, { name: 'desc' });
  });
});

describe('Org Module - OrgService Unit Tests', () => {
  it('checkSlug should return available true when slug is not found', async () => {
    const fakePrisma = {
      organizacion: {
        findUnique: async () => null,
      },
    };
    const fakeTenant = { organizacion_id: 'org-1', role: 'admin' };
    const service = new OrgService(
      fakePrisma as any,
      {} as any,
      fakeTenant as any,
    );

    const res = await service.checkSlug('unique-slug');
    assert.equal(res.available, true);
    assert.equal(res.suggestion, undefined);
  });

  it('checkSlug should return available false and suggestion when slug is taken', async () => {
    const fakePrisma = {
      organizacion: {
        findUnique: async ({ where }: any) => {
          if (where.slug === 'taken-slug') return { id: 'org-existing' };
          if (where.slug === 'taken-slug-1') return null;
          return null;
        },
      },
    };
    const fakeTenant = { organizacion_id: 'org-1', role: 'admin' };
    const service = new OrgService(
      fakePrisma as any,
      {} as any,
      fakeTenant as any,
    );

    const res = await service.checkSlug('taken-slug');
    assert.equal(res.available, false);
    assert.equal(res.suggestion, 'taken-slug-1');
  });

  it('orgCreate should throw ConflictException if slug is already in use', async () => {
    const fakePrisma = {
      organizacion: {
        findUnique: async () => ({ id: 'existing-id' }),
      },
    };
    const service = new OrgService(
      fakePrisma as any,
      {} as any,
      { organizacion_id: 'org-1' } as any,
    );

    await assert.rejects(
      async () => {
        await service.orgCreate({
          name: 'My Org',
          slug: 'duplicate-slug',
          user: {
            name: 'Admin',
            email: 'admin@org.com',
            password: 'secretpassword',
          },
        });
      },
      (err: unknown) => {
        assert(err instanceof ConflictException);
        assert.match(err.message, /ya está en uso/);
        return true;
      },
    );
  });

  it('detail should throw canonical 404 when org id does not match tenant context', async () => {
    const fakePrisma = {
      organizacion: {
        findFirst: async () => null,
      },
    };
    const service = new OrgService(
      fakePrisma as any,
      {} as any,
      { organizacion_id: 'tenant-123', role: 'admin' } as any,
    );

    await assert.rejects(
      async () => {
        await service.detail('different-org-id');
      },
      (err: unknown) => {
        assert(err instanceof NotFoundException);
        assert.equal(
          err.message,
          'Organización con id "different-org-id" no encontrada',
        );
        return true;
      },
    );
  });

  it('restore should throw canonical 404 if id does not match tenant context', async () => {
    const fakePrisma = {
      organizacion: {
        findUnique: async () => null,
      },
    };
    const service = new OrgService(
      fakePrisma as any,
      {} as any,
      { organizacion_id: 'tenant-123', role: 'admin' } as any,
    );

    await assert.rejects(
      async () => {
        await service.restore('foreign-org-id');
      },
      (err: unknown) => {
        assert(err instanceof NotFoundException);
        assert.equal(
          err.message,
          'Organización con id "foreign-org-id" no encontrada o no eliminada',
        );
        return true;
      },
    );
  });
});
