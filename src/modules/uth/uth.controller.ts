import { Controller, Get, Post, Body, Headers, Req, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

/** Mínimo del request/response que usa el controlador (runtime: Fastify). */
interface AuthedRequest {
  headers: Record<string, string | string[] | undefined>;
}

interface FastifyReply {
  header: (name: string, value: string) => void;
}

import { UthService } from './uth.service';
import { TokenCleanupService } from './token-cleanup.service';
import { LoginDto } from './uth.dto';
import { Public, CurrentUser, Roles } from '../../common/decorators';

@ApiTags('Auth')
@Controller('auth')
export class UthController {
  constructor(
    private readonly uthService: UthService,
    private readonly tokenCleanupService: TokenCleanupService,
  ) {}

  @Post('login')
  @Public()
  @SkipThrottle()
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiResponse({ status: 201, description: 'Login exitoso' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const result = await this.uthService.loginWithCookie(dto);
    if (result.cookie) {
      res.header('set-cookie', result.cookie);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { cookie, refresh_token, ...response } = result;
    return response;
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Usuario actual' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async me(@CurrentUser('sub') userId: string) {
    return this.uthService.me(userId);
  }

  @Post('refresh')
  @Public()
  @SkipThrottle()
  @ApiOperation({ summary: 'Refresh access token usando cookie httpOnly' })
  @ApiResponse({ status: 201, description: 'Nuevo access token' })
  async refresh(
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const result = await this.uthService.refreshWithCookie(req);
    if (result.cookie) {
      res.header('set-cookie', result.cookie);
    }
    return { access_token: result.access_token, message: result.message };
  }

  @Post('logout')
  @ApiBearerAuth()
  @SkipThrottle()
  @ApiOperation({
    summary: 'Cerrar sesión (invalida el token y borra la cookie)',
  })
  @ApiResponse({ status: 201, description: 'Sesión cerrada' })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token',
    required: true,
  })
  async logout(
    @Headers('authorization') auth: string | undefined,
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const token = auth?.replace('Bearer ', '') ?? '';
    const result = await this.uthService.logoutWithCookie(token, req);
    if (result.clearCookie) {
      res.header('set-cookie', result.clearCookie);
    }
    return { message: result.message };
  }

  @Post('cleanup-blacklist')
  @ApiBearerAuth()
  @Roles('admin')
  @ApiOperation({ summary: 'Limpiar tokens expirados de la blacklist (admin)' })
  @ApiResponse({ status: 201, description: 'Cleanup completado' })
  async cleanupBlacklist() {
    const deleted = await this.tokenCleanupService.cleanExpiredBlacklist();
    return { message: `${deleted} tokens expirados eliminados` };
  }
}
