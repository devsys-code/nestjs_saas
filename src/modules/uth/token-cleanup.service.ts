import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TokenCleanupService {
  private readonly logger = new Logger(TokenCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 3 * * *')
  handleDailyBlacklistCleanup() {
    this.cleanExpiredBlacklist()
      .then((deleted) => {
        if (deleted > 0) {
          this.logger.log(`${deleted} blacklist tokens expirados eliminados`);
        }
      })
      .catch((error: unknown) => {
        this.logger.error('Error en limpieza de blacklist', String(error));
      });
  }

  @Cron('0 3 * * 0')
  handleWeeklyRefreshCleanup() {
    this.cleanExpiredRefreshTokens()
      .then((deleted) => {
        if (deleted > 0) {
          this.logger.log(`${deleted} refresh tokens expirados eliminados`);
        }
      })
      .catch((error: unknown) => {
        this.logger.error('Error en limpieza de refresh tokens', String(error));
      });
  }

  cleanExpiredBlacklist = async (): Promise<number> => {
    const result = await this.prisma.tokenBlacklist.deleteMany({
      where: {
        expired_at: { lt: new Date() },
      },
    });
    return result.count;
  };

  cleanExpiredRefreshTokens = async (): Promise<number> => {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        expires_at: { lt: new Date() },
      },
    });
    return result.count;
  };
}
