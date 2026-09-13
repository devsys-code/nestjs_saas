import { Controller } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { createTenantController } from '../../common/crud/tenant-crud.controller';
import { TskService } from './tsk.service';
import { CreateTaskDto, UpdateTaskDto } from './tsk.dto';
import { TaskFilterDto } from './tsk.filter';

@ApiTags('Task')
@ApiBearerAuth()
@Controller('task')
export class TskController extends createTenantController({
  entityName: 'Tarea',
  createDto: CreateTaskDto,
  updateDto: UpdateTaskDto,
  filterDto: TaskFilterDto,
}) {
  constructor(public readonly tskService: TskService) {
    super(tskService);
  }
}
