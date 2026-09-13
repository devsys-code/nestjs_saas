import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY, ROLES_KEY } from '../../common/decorators';
import { UthService } from './uth.service';

interface AuthedRequest {
  user?: Record<string, unknown>;
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: UthService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    await super.canActivate(context);

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const user = request.user;

    if (user && typeof user.jti === 'string') {
      const blacklisted = await this.authService.isTokenBlacklisted(user.jti);
      if (blacklisted) {
        throw new UnauthorizedException('Token invalidado (sesión cerrada)');
      }
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const hasRole = requiredRoles.some((role) => user?.role === role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Se requiere uno de estos roles: ${requiredRoles.join(', ')}`,
      );
    }
    return true;
  }
}
