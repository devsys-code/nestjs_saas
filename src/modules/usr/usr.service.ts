import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UthService } from '../uth/uth.service';
import { TenantService } from '../uth/tenant.service';
import { BaseTenantService } from '../../common/crud/base-tenant.service';
import { buildUsrWhere, buildUsrOrderBy } from './usr.filter';
import { CreateUserDto, UpdateUserDto } from './usr.dto';
import type { UserModel } from '../../../generated/prisma/models';

export const USR_SELECT = {
  id: true,
  organizacion_id: true,
  email: true,
  name: true,
  role: true,
  is_active: true,
  created_at: true,
  updated_at: true,
  deleted_at: true,
} as const;

export type UserWithoutPassword = Omit<UserModel, 'password'>;

@Injectable()
export class UsrService extends BaseTenantService<
  UserWithoutPassword,
  CreateUserDto,
  UpdateUserDto
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: UthService,
    tenant: TenantService,
  ) {
    super(prisma.user, tenant, {
      entityName: 'Usuario',
      gender: 'm',
      buildWhere: buildUsrWhere,
      buildOrderBy: buildUsrOrderBy,
      select: USR_SELECT,
    });
  }

  override create = async (dto: CreateUserDto) => {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        organizacion_id: this.tenantId,
        email: dto.email,
      },
    });
    if (existingUser) {
      throw new ConflictException(
        `El email "${dto.email}" ya está registrado en esta organización`,
      );
    }

    const hashedPassword = await this.authService.hashPassword(dto.password);
    return this.prisma.user.create({
      data: {
        organizacion_id: this.tenantId,
        email: dto.email,
        name: dto.name,
        password: hashedPassword,
        role: dto.role ?? 'member',
      },
      select: USR_SELECT,
    });
  };

  override update = async (id: string, dto: UpdateUserDto) => {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        id,
        organizacion_id: this.tenantId,
        deleted_at: null,
      },
    });
    if (!existingUser) {
      throw new NotFoundException(`Usuario con id "${id}" no encontrado`);
    }

    if (dto.email) {
      const emailTaken = await this.prisma.user.findFirst({
        where: {
          organizacion_id: this.tenantId,
          email: dto.email,
          id: { not: id },
        },
      });
      if (emailTaken) {
        throw new ConflictException(
          `El email "${dto.email}" ya está registrado en esta organización`,
        );
      }
    }

    const data: Record<string, unknown> = { ...dto };
    if (dto.password) {
      data.password = await this.authService.hashPassword(dto.password);
    }
    delete data.organizacion_id;

    await this.prisma.user.updateMany({
      where: {
        id,
        organizacion_id: this.tenantId,
        deleted_at: null,
      },
      data,
    });
    return this.prisma.user.findFirst({
      where: { id, organizacion_id: this.tenantId },
      select: USR_SELECT,
    });
  };
}
