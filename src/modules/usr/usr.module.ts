import { Module } from '@nestjs/common';
import { UsrService } from './usr.service';
import { UsrController } from './usr.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { UthModule } from '../uth/uth.module';
import { TenantModule } from '../uth/tenant.module';

@Module({
  imports: [PrismaModule, UthModule, TenantModule],
  providers: [UsrService],
  controllers: [UsrController],
})
export class UsrModule {}
