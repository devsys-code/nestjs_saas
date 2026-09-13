import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { buildUsrWhere, buildUsrOrderBy, UsrFilterDto } from './usr.filter';
import { UsrService } from './usr.service';

describe('Usr Module - Filter Unit Tests', () => {
  it('buildUsrWhere should correctly parse role and search filters', () => {
    const filter = new UsrFilterDto();
    filter.role = 'admin';
    const where = buildUsrWhere(filter);
    assert.deepEqual(where, { role: 'admin', deleted_at: null });
  });

  it('buildUsrOrderBy should map order_by correctly', () => {
    const filter = new UsrFilterDto();
    filter.order_by = 'email';
    const orderBy = buildUsrOrderBy(filter);
    assert.deepEqual(orderBy, { email: 'desc' });
  });
});

describe('Usr Module - UsrService Unit Tests', () => {
  it('create should throw ConflictException if email is already taken in tenant', async () => {
    const fakePrisma = {
      user: {
        findFirst: async () => ({ id: 'existing-user' }),
      },
    };
    const fakeAuth = { hashPassword: async (p: string) => 'hashed_' + p };
    const fakeTenant = { organizacion_id: 'org-tenant-123' };
    const service = new UsrService(
      fakePrisma as any,
      fakeAuth as any,
      fakeTenant as any,
    );

    await assert.rejects(
      async () => {
        await service.create({
          email: 'duplicate@test.com',
          name: 'Duplicated User',
          password: 'password123',
        });
      },
      (err: unknown) => {
        assert(err instanceof ConflictException);
        assert.match(err.message, /ya está registrado/);
        return true;
      },
    );
  });

  it('create should hash password and default role to member', async () => {
    let createdPayload: any = null;
    const fakePrisma = {
      user: {
        findFirst: async () => null,
        create: async (args: any) => {
          createdPayload = args.data;
          return { id: 'usr-1', ...args.data };
        },
      },
    };
    const fakeAuth = { hashPassword: async (p: string) => 'hashed_' + p };
    const fakeTenant = { organizacion_id: 'org-tenant-123' };
    const service = new UsrService(
      fakePrisma as any,
      fakeAuth as any,
      fakeTenant as any,
    );

    const result = await service.create({
      email: 'newuser@test.com',
      name: 'New User',
      password: 'plainpassword',
    });

    assert.equal(createdPayload.organizacion_id, 'org-tenant-123');
    assert.equal(createdPayload.email, 'newuser@test.com');
    assert.equal(createdPayload.password, 'hashed_plainpassword');
    assert.equal(createdPayload.role, 'member');
    assert.equal(result.id, 'usr-1');
  });

  it('detail should throw canonical 404 with masculine gender (Usuario no encontrado)', async () => {
    const fakePrisma = {
      user: {
        findFirst: async () => null,
      },
    };
    const fakeTenant = { organizacion_id: 'org-tenant-123' };
    const service = new UsrService(
      fakePrisma as any,
      {} as any,
      fakeTenant as any,
    );

    await assert.rejects(
      async () => {
        await service.detail('user-non-existent');
      },
      (err: unknown) => {
        assert(err instanceof NotFoundException);
        assert.equal(
          err.message,
          'Usuario con id "user-non-existent" no encontrado',
        );
        return true;
      },
    );
  });

  it('update should throw NotFoundException if user does not exist', async () => {
    const fakePrisma = {
      user: {
        findFirst: async () => null,
      },
    };
    const fakeTenant = { organizacion_id: 'org-tenant-123' };
    const service = new UsrService(
      fakePrisma as any,
      {} as any,
      fakeTenant as any,
    );

    await assert.rejects(
      async () => {
        await service.update('unknown-user', { name: 'New Name' });
      },
      (err: unknown) => {
        assert(err instanceof NotFoundException);
        assert.equal(
          err.message,
          'Usuario con id "unknown-user" no encontrado',
        );
        return true;
      },
    );
  });
});
