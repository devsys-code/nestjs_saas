import { Module } from '@nestjs/common';
import { SedService } from './sed.service';
import { SedController } from './sed.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SedService],
  controllers: [SedController],
})
export class SedModule {}
