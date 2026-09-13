import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Scope,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantService } from './tenant.service';
import { IS_PUBLIC_KEY } from '../../common/decorators';

interface JwtUserPayload {
  organizacion_id: string;
  sub: string;
  email: string;
  role: string;
}

interface AuthedRequest {
  user?: JwtUserPayload;
}

@Injectable({ scope: Scope.REQUEST })
export class TenantGuard implements CanActivate {
  constructor(
    private readonly tenant: TenantService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const user = request.user;
    if (!user) return false;

    this.tenant.organizacion_id = user.organizacion_id;
    this.tenant.user_id = user.sub;
    this.tenant.email = user.email;
    this.tenant.role = user.role;
    return true;
  }
}
