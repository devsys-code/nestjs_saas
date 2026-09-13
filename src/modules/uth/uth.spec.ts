import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as bcryptjs from 'bcryptjs';
import { UnauthorizedException } from '@nestjs/common';
import { UthService, getNextSunday3AM } from './uth.service';

describe('Uth Module - Helpers & Password Tests', () => {
  it('getNextSunday3AM should return a future date on Sunday at 03:00 AM', () => {
    const nextSunday = getNextSunday3AM();
    assert(nextSunday instanceof Date);
    assert(nextSunday.getTime() > Date.now());
    assert.equal(nextSunday.getDay(), 0); // 0 = Sunday
    assert.equal(nextSunday.getHours(), 3);
    assert.equal(nextSunday.getMinutes(), 0);
  });

  it('hashPassword and bcryptjs.compare should correctly hash and verify passwords', async () => {
    const service = new UthService({} as any, {} as any);
    const plain = 'supersecret123';
    const hash = await service.hashPassword(plain);

    assert.notEqual(hash, plain);
    const isValid = await bcryptjs.compare(plain, hash);
    assert.equal(isValid, true);

    const isInvalid = await bcryptjs.compare('wrongpassword', hash);
    assert.equal(isInvalid, false);
  });
});

describe('Uth Module - Login Unit Tests', () => {
  it('login should throw UnauthorizedException if user does not exist', async () => {
    const fakePrisma = {
      user: {
        findFirst: async () => null,
      },
    };
    const service = new UthService(fakePrisma as any, {} as any);

    await assert.rejects(
      async () => {
        await service.login({
          email: 'unknown@org.com',
          password: 'password123',
        });
      },
      (err: unknown) => {
        assert(err instanceof UnauthorizedException);
        assert.equal(err.message, 'Usuario no registrado');
        return true;
      },
    );
  });

  it('login should throw UnauthorizedException if password does not match', async () => {
    const service = new UthService({} as any, {} as any);
    const correctHash = await service.hashPassword('realpassword');

    const fakePrisma = {
      user: {
        findFirst: async () => ({
          id: 'user-1',
          email: 'test@org.com',
          password: correctHash,
          is_active: true,
        }),
      },
    };
    const serviceWithPrisma = new UthService(fakePrisma as any, {} as any);

    await assert.rejects(
      async () => {
        await serviceWithPrisma.login({
          email: 'test@org.com',
          password: 'wrongpassword',
        });
      },
      (err: unknown) => {
        assert(err instanceof UnauthorizedException);
        assert.equal(err.message, 'Contraseña incorrecta');
        return true;
      },
    );
  });

  it('login should succeed and return access token and refresh token for valid credentials', async () => {
    const service = new UthService({} as any, {} as any);
    const correctHash = await service.hashPassword('mypassword123');

    const fakeUser = {
      id: 'user-uuid-1',
      email: 'member@test.com',
      name: 'Test Member',
      password: correctHash,
      role: 'member',
      organizacion_id: 'org-uuid-1',
      is_active: true,
    };

    const fakePrisma = {
      user: {
        findFirst: async () => fakeUser,
      },
      refreshToken: {
        create: async () => ({}),
      },
    };

    const fakeJwt = {
      sign: (payload: any) => `mock_token_for_${payload.email}`,
    };

    const serviceWithAuth = new UthService(fakePrisma as any, fakeJwt as any);
    const result = await serviceWithAuth.login({
      email: 'member@test.com',
      password: 'mypassword123',
    });

    assert.equal(result.access_token, 'mock_token_for_member@test.com');
    assert.equal(result.user.id, 'user-uuid-1');
    assert.equal(result.user.email, 'member@test.com');
    assert.ok(result.refresh_token);
  });
});
