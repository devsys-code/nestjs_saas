import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { UthModule } from './modules/uth/uth.module';
import { TenantModule } from './modules/uth/tenant.module';
import { OrgModule } from './modules/org/org.module';
import { UsrModule } from './modules/usr/usr.module';
import { TskModule } from './modules/tsk/tsk.module';
import { SedModule } from './modules/sed/sed.module';
import { JwtAuthGuard } from './modules/uth/jwt-auth.guard';
import { TenantGuard } from './modules/uth/tenant.guard';
import { AppController } from './app.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 100,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 500,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 2000,
      },
    ]),
    PrismaModule,
    TenantModule,
    UthModule,
    OrgModule,
    UsrModule,
    TskModule,
    SedModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
  ],
})
export class AppModule {}
