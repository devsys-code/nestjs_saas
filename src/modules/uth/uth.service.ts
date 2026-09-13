import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcryptjs from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { LoginDto } from './uth.dto';

/** Mínimo del request que usa el servicio (runtime: Fastify). */
export interface CookieRequest {
  headers: Record<string, string | string[] | undefined>;
}

export const getNextSunday3AM = (): Date => {
  const now = new Date();
  const day = now.getDay();
  const daysUntilSunday =
    day === 0 && now.getHours() < 3 ? 0 : (7 - day) % 7 || 7;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntilSunday);
  next.setHours(3, 0, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 7);
  }
  return next;
};

const secondsUntil = (date: Date): number => {
  return Math.floor((date.getTime() - Date.now()) / 1000);
};

const getSameSiteOption = (): 'strict' | 'lax' | 'none' => {
  return process.env.NODE_ENV === 'production' ? 'strict' : 'lax';
};

const buildRefreshCookie = (refreshToken: string): string => {
  const sameSite = getSameSiteOption();
  const maxAgeSec = Math.floor(
    (getNextSunday3AM().getTime() - Date.now()) / 1000,
  );
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `refreshToken=${encodeURIComponent(refreshToken)}; HttpOnly; Path=/; Max-Age=${maxAgeSec}; SameSite=${sameSite}${secure}`;
};

interface VerifiedPayload {
  sub?: string;
  jti?: string;
  email?: string;
  organizacion_id?: string;
  role?: string;
  exp?: number;
}

@Injectable()
export class UthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  login = async (dto: LoginDto) => {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, deleted_at: null },
    });
    if (!user) {
      throw new UnauthorizedException('Usuario no registrado');
    }
    if (!user.is_active) {
      throw new UnauthorizedException('Usuario no registrado');
    }

    const valid = await bcryptjs.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    const jti = uuid();
    const payload = {
      sub: user.id,
      email: user.email,
      organizacion_id: user.organizacion_id,
      role: user.role,
      jti,
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshJti = uuid();
    const refreshPayload = { sub: user.id, jti: refreshJti };
    const expiresAt = getNextSunday3AM();
    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: secondsUntil(expiresAt),
    });

    await this.prisma.refreshToken.create({
      data: {
        jti: refreshJti,
        user_id: user.id,
        expires_at: expiresAt,
      },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizacion_id: user.organizacion_id,
      },
    };
  };

  logout = async (token: string) => {
    try {
      const payload = this.jwtService.verify<VerifiedPayload>(token);
      const jti = payload?.jti;
      const sub = payload?.sub;
      const exp = payload?.exp;

      if (!jti || !exp || !sub) {
        return { message: 'Sesión cerrada exitosamente' };
      }

      const expiredAt = new Date(exp * 1000);

      await this.prisma.tokenBlacklist.create({
        data: {
          jti,
          user_id: sub,
          expired_at: expiredAt,
        },
      });

      return { message: 'Sesión cerrada exitosamente' };
    } catch {
      return { message: 'Sesión cerrada exitosamente' };
    }
  };

  logoutWithCookie = async (accessToken: string, req: CookieRequest) => {
    await this.logout(accessToken);

    const refreshToken = this.extractRefreshTokenFromRequest(req);
    if (refreshToken) {
      try {
        const payload = this.jwtService.verify<VerifiedPayload>(refreshToken);
        if (payload?.jti) {
          await this.prisma.refreshToken.updateMany({
            where: { jti: payload.jti, revoked: false },
            data: { revoked: true },
          });
        }
      } catch {
        // refresh token expirado o inválido
      }
    }

    const sameSite = getSameSiteOption();
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    const clearCookie = `refreshToken=; HttpOnly; Path=/; Max-Age=0; SameSite=${sameSite}${secure}`;

    return { message: 'Sesión cerrada exitosamente', clearCookie };
  };

  isTokenBlacklisted = async (jti: string): Promise<boolean> => {
    if (!jti) return false;
    const blacklisted = await this.prisma.tokenBlacklist.findUnique({
      where: { jti },
    });
    if (!blacklisted) return false;
    return blacklisted.expired_at > new Date();
  };

  refresh = async (refreshToken: string) => {
    try {
      const payload = this.jwtService.verify<VerifiedPayload>(refreshToken);
      const jti = payload?.jti;
      const sub = payload?.sub;
      if (!jti || !sub)
        throw new UnauthorizedException('Refresh token inválido');

      const existing = await this.prisma.refreshToken.findUnique({
        where: { jti },
      });
      if (!existing)
        throw new UnauthorizedException('Refresh token no encontrado');
      if (existing.revoked)
        throw new UnauthorizedException('Refresh token revocado');
      if (existing.expires_at <= new Date())
        throw new UnauthorizedException('Refresh token expirado');

      const newJti = uuid();
      const newExpiresAt = getNextSunday3AM();
      const newRefreshToken = this.jwtService.sign(
        { sub, jti: newJti },
        { expiresIn: secondsUntil(newExpiresAt) },
      );

      await this.prisma.refreshToken.create({
        data: {
          jti: newJti,
          user_id: sub,
          expires_at: newExpiresAt,
        },
      });

      await this.prisma.refreshToken.update({
        where: { jti },
        data: { revoked: true, replaced_by: newJti },
      });

      const user = await this.prisma.user.findUnique({ where: { id: sub } });
      if (!user) throw new UnauthorizedException('Usuario no encontrado');

      const accessJti = uuid();
      const accessPayload = {
        sub: user.id,
        email: user.email,
        organizacion_id: user.organizacion_id,
        role: user.role,
        jti: accessJti,
      };
      const newAccessToken = this.jwtService.sign(accessPayload);

      return { access_token: newAccessToken, refresh_token: newRefreshToken };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  };

  extractRefreshTokenFromRequest = (req: CookieRequest): string | undefined => {
    const headerCookie = req.headers?.cookie;
    if (typeof headerCookie !== 'string' || !headerCookie) {
      return undefined;
    }
    const cookieParts = headerCookie.split(';').map((c) => c.trim());
    for (const c of cookieParts) {
      if (c.startsWith('refreshToken=')) {
        return decodeURIComponent(c.split('=')[1]);
      }
    }
    return undefined;
  };

  refreshWithCookie = async (req: CookieRequest) => {
    const refreshToken = this.extractRefreshTokenFromRequest(req);
    if (!refreshToken) {
      return {
        cookie: undefined,
        access_token: undefined,
        message: 'No refresh token proporcionado',
      };
    }
    const result = await this.refresh(refreshToken);
    const cookie = result.refresh_token
      ? buildRefreshCookie(result.refresh_token)
      : undefined;
    return { cookie, access_token: result.access_token, message: undefined };
  };

  loginWithCookie = async (dto: LoginDto) => {
    const result = await this.login(dto);
    const cookie = result.refresh_token
      ? buildRefreshCookie(result.refresh_token)
      : undefined;
    return { ...result, refresh_token: undefined, cookie };
  };

  hashPassword = async (password: string): Promise<string> => {
    return bcryptjs.hash(password, 10);
  };

  me = async (userId: string) => {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deleted_at: null },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizacion_id: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    return { user };
  };
}
