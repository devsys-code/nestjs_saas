import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<{
      status: (code: number) => { send: (body: unknown) => void };
    }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Error interno del servidor';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message =
        typeof res === 'string'
          ? res
          : ((res as { message?: string | string[] }).message ?? message);
    } else if (
      exception &&
      typeof exception === 'object' &&
      'code' in exception &&
      typeof exception.code === 'string'
    ) {
      const prismaCode = (exception as { code: string }).code;
      if (prismaCode === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'Conflicto: ya existe un registro con esos datos únicos';
      } else if (prismaCode === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'El registro solicitado no fue encontrado';
      } else if (prismaCode === 'P2003') {
        status = HttpStatus.BAD_REQUEST;
        message = 'Restricción de relación no cumplida';
      } else if (exception instanceof Error) {
        this.logger.error(
          `${exception.name} [${prismaCode}]: ${exception.message}`,
          exception.stack,
        );
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `${exception.name}: ${exception.message}`,
        exception.stack,
      );
    }

    response.status(status).send({ statusCode: status, message });
  }
}
