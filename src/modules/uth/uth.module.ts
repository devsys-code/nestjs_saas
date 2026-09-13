import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UthService } from './uth.service';
import { UthController } from './uth.controller';
import { JwtStrategy } from './jwt.strategy';
import { TokenCleanupService } from './token-cleanup.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'super-secret-jwt-key-2026',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN ?? '15m' } as never,
    }),
  ],
  controllers: [UthController],
  providers: [UthService, JwtStrategy, TokenCleanupService],
  exports: [UthService],
})
export class UthModule {}
