import { Module } from '@nestjs/common';
import { OrgService } from './org.service';
import { OrgController } from './org.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { UthModule } from '../uth/uth.module';
import { TenantModule } from '../uth/tenant.module';

@Module({
  imports: [PrismaModule, UthModule, TenantModule],
  providers: [OrgService],
  controllers: [OrgController],
})
export class OrgModule {}
