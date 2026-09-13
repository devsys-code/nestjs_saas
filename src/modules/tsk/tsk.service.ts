import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantService } from '../uth/tenant.service';
import { BaseTenantService } from '../../common/crud/base-tenant.service';
import { buildTaskWhere, buildTaskOrderBy } from './tsk.filter';
import { CreateTaskDto, UpdateTaskDto } from './tsk.dto';
import type { TaskModel } from '../../../generated/prisma/models';

@Injectable()
export class TskService extends BaseTenantService<
  TaskModel,
  CreateTaskDto,
  UpdateTaskDto
> {
  constructor(prisma: PrismaService, tenant: TenantService) {
    super(prisma.task, tenant, {
      entityName: 'Tarea',
      gender: 'f',
      buildWhere: buildTaskWhere,
      buildOrderBy: buildTaskOrderBy,
    });
  }
}
