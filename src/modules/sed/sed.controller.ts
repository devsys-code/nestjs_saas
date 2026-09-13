import { Controller, Get, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { SedService } from './sed.service';
import { Public } from '../../common/decorators';

@ApiTags('Seed')
@Controller()
@SkipThrottle()
export class SedController {
  constructor(private readonly sedService: SedService) {}

  @Get('seed')
  @Public()
  @ApiOperation({
    summary: 'Generar datos de prueba (5 Org × 5 Users × 100 Tasks)',
  })
  @ApiResponse({ status: 200, description: 'Datos generados exitosamente' })
  async seed() {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Operación no permitida en producción');
    }
    return this.sedService.seed();
  }

  @Get('reset')
  @Public()
  @ApiOperation({ summary: 'Resetear todas las tablas (TRUNCATE)' })
  @ApiResponse({ status: 200, description: 'Tablas reseteadas' })
  async reset() {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Operación no permitida en producción');
    }
    return this.sedService.reset();
  }
}
