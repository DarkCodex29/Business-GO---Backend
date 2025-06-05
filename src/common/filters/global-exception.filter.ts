import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse, ApiError } from '../interfaces/api-response.interface';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, errors } = this.getErrorDetails(exception);

    const errorResponse: ApiResponse<null> = {
      success: false,
      data: null,
      message,
      errors,
      timestamp: new Date().toISOString(),
    };

    // Log del error
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : exception,
    );

    response.status(status).json(errorResponse);
  }

  private getErrorDetails(exception: unknown): {
    status: number;
    message: string;
    errors: string[];
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'object' && response !== null) {
        const responseObj = response as any;

        // Manejo de errores de validación
        if (responseObj.message && Array.isArray(responseObj.message)) {
          return {
            status,
            message: 'Error de validación',
            errors: responseObj.message,
          };
        }

        return {
          status,
          message: responseObj.message || exception.message,
          errors: responseObj.errors || [],
        };
      }

      return {
        status,
        message: exception.message,
        errors: [],
      };
    }

    // Error no controlado
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error interno del servidor',
      errors: ['Ha ocurrido un error inesperado'],
    };
  }
}
