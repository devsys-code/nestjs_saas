import { Controller } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { createTenantController } from '../../common/crud/tenant-crud.controller';
import { UsrService } from './usr.service';
import { CreateUserDto, UpdateUserDto } from './usr.dto';
import { UsrFilterDto } from './usr.filter';

@ApiTags('User')
@ApiBearerAuth()
@Controller('usr')
export class UsrController extends createTenantController({
  entityName: 'Usuario',
  createDto: CreateUserDto,
  updateDto: UpdateUserDto,
  filterDto: UsrFilterDto,
}) {
  constructor(public readonly usrService: UsrService) {
    super(usrService);
  }
}
