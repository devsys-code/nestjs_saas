import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { createTenantController } from '../../common/crud/tenant-crud.controller';
import { OrgService } from './org.service';
import { CreateOrgDto, UpdateOrgDto } from './org.dto';
import { OrgFilterDto } from './org.filter';
import { Public, Roles } from '../../common/decorators';

@ApiTags('Organization')
@Controller('org')
export class OrgController extends createTenantController({
  entityName: 'Organización',
  createDto: CreateOrgDto,
  updateDto: UpdateOrgDto,
  filterDto: OrgFilterDto,
}) {
  constructor(public readonly orgService: OrgService) {
    super(orgService);
  }

  @Post('create')
  @Public()
  @ApiOperation({ summary: 'Crear organización + primer usuario admin' })
  @ApiResponse({ status: 201, description: 'Organización creada' })
  override async create(@Body() dto: CreateOrgDto) {
    return this.orgService.orgCreate(dto);
  }

  @Get('check-slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Verificar disponibilidad de slug' })
  @ApiResponse({ status: 200, description: 'Slug disponible o sugerencia' })
  async checkSlug(@Param('slug') slug: string) {
    return this.orgService.checkSlug(slug);
  }

  @Patch('update/:id')
  @ApiBearerAuth()
  @Roles('admin')
  @ApiOperation({ summary: 'Actualizar organización' })
  override async update(@Param('id') id: string, @Body() dto: UpdateOrgDto) {
    return this.orgService.update(id, dto);
  }
}
