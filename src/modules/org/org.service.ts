import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UthService } from '../uth/uth.service';
import { TenantService } from '../uth/tenant.service';
import { BaseTenantService } from '../../common/crud/base-tenant.service';
import { buildOrgWhere, buildOrgOrderBy } from './org.filter';
import { CreateOrgDto, UpdateOrgDto } from './org.dto';
import type { OrganizacionModel } from '../../../generated/prisma/models';

@Injectable()
export class OrgService extends BaseTenantService<
  OrganizacionModel,
  CreateOrgDto,
  UpdateOrgDto
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: UthService,
    tenant: TenantService,
  ) {
    super(prisma.organizacion, tenant, {
      entityName: 'Organización',
      gender: 'f',
      tenantField: 'id',
      buildWhere: buildOrgWhere,
      buildOrderBy: buildOrgOrderBy,
    });
  }

  private assertOrgAdmin = (orgId: string) => {
    if (this.tenantId !== orgId || this.tenant.role !== 'admin') {
      throw new ForbiddenException(
        'No tienes permisos para modificar esta organización',
      );
    }
  };

  orgCreate = async (dto: CreateOrgDto) => {
    const existingSlug = await this.prisma.organizacion.findUnique({
      where: { slug: dto.slug },
    });
    if (existingSlug) {
      throw new ConflictException(`El slug "${dto.slug}" ya está en uso`);
    }

    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organizacion.create({
        data: { name: dto.name, slug: dto.slug },
      });

      const hashedPassword = await this.authService.hashPassword(
        dto.user.password,
      );

      const user = await tx.user.create({
        data: {
          organizacion_id: org.id,
          email: dto.user.email,
          name: dto.user.name,
          password: hashedPassword,
          role: 'admin',
        },
      });

      return {
        organizacion: org,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    });
  };

  override update = async (id: string, dto: UpdateOrgDto) => {
    const org = await this.detail(id);
    if (org.deleted_at) {
      throw new NotFoundException(`Organización con id "${id}" no encontrada`);
    }
    this.assertOrgAdmin(id);

    if (dto.slug && dto.slug !== org.slug) {
      const existingSlug = await this.prisma.organizacion.findUnique({
        where: { slug: dto.slug },
      });
      if (existingSlug && existingSlug.id !== id) {
        throw new ConflictException(`El slug "${dto.slug}" ya está en uso`);
      }
    }

    return this.prisma.organizacion.update({ where: { id }, data: dto });
  };

  override delete = async (id: string) => {
    const org = await this.detail(id);
    if (org.deleted_at) {
      throw new NotFoundException(`Organización con id "${id}" no encontrada`);
    }
    this.assertOrgAdmin(id);
    await this.prisma.organizacion.update({
      where: { id },
      data: { deleted_at: new Date(), is_active: false },
    });
    return { message: 'Organización eliminada correctamente' };
  };

  override restore = async (id: string) => {
    if (id !== this.tenantId) {
      throw new NotFoundException(
        `Organización con id "${id}" no encontrada o no eliminada`,
      );
    }
    const org = await this.prisma.organizacion.findUnique({
      where: { id, deleted_at: { not: null } },
    });
    if (!org) {
      throw new NotFoundException(
        `Organización con id "${id}" no encontrada o no eliminada`,
      );
    }
    this.assertOrgAdmin(id);
    await this.prisma.organizacion.update({
      where: { id },
      data: { deleted_at: null, is_active: true },
    });
    return { message: 'Organización restaurada correctamente' };
  };

  checkSlug = async (
    slug: string,
  ): Promise<{ available: boolean; suggestion?: string }> => {
    const existing = await this.prisma.organizacion.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing) {
      return { available: true };
    }

    let suggestion: string;
    let counter = 1;
    do {
      suggestion = `${slug}-${counter}`;
      counter++;
      const taken = await this.prisma.organizacion.findUnique({
        where: { slug: suggestion },
        select: { id: true },
      });
      if (!taken) break;
    } while (counter <= 10);

    return { available: false, suggestion };
  };
}
