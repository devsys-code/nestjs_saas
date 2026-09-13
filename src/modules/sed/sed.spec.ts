import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ForbiddenException } from '@nestjs/common';
import { SedController } from './sed.controller';

describe('Sed Module - SedController Unit Tests', () => {
  it('seed should throw ForbiddenException when in production', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const fakeSedService = { seed: async () => ({}) };
      const controller = new SedController(fakeSedService as any);

      await assert.rejects(
        async () => {
          await controller.seed();
        },
        (err: unknown) => {
          assert(err instanceof ForbiddenException);
          assert.equal(err.message, 'Operación no permitida en producción');
          return true;
        },
      );
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('reset should throw ForbiddenException when in production', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const fakeSedService = { reset: async () => ({}) };
      const controller = new SedController(fakeSedService as any);

      await assert.rejects(
        async () => {
          await controller.reset();
        },
        (err: unknown) => {
          assert(err instanceof ForbiddenException);
          assert.equal(err.message, 'Operación no permitida en producción');
          return true;
        },
      );
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('seed should delegate to SedService when not in production', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    try {
      let seedCalled = false;
      const fakeSedService = {
        seed: async () => {
          seedCalled = true;
          return { message: 'Seed completado', organizaciones: 5 };
        },
      };
      const controller = new SedController(fakeSedService as any);

      const result = await controller.seed();
      assert.equal(seedCalled, true);
      assert.equal(result.message, 'Seed completado');
      assert.equal(result.organizaciones, 5);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('reset should delegate to SedService when not in production', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    try {
      let resetCalled = false;
      const fakeSedService = {
        reset: async () => {
          resetCalled = true;
          return { message: 'Tablas vaciadas', totalRemaining: 0 };
        },
      };
      const controller = new SedController(fakeSedService as any);

      const result = await controller.reset();
      assert.equal(resetCalled, true);
      assert.equal(result.message, 'Tablas vaciadas');
      assert.equal(result.totalRemaining, 0);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
