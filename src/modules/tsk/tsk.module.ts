import { Module } from '@nestjs/common';
import { TskService } from './tsk.service';
import { TskController } from './tsk.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { TenantModule } from '../uth/tenant.module';
@Module({
  imports: [PrismaModule, TenantModule],
  providers: [TskService],
  controllers: [TskController],
})
export class TskModule {}
