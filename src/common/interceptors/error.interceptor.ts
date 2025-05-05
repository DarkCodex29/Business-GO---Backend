import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import * as Sentry from '@sentry/node';

/**
 * Interceptor para manejar errores de forma centralizada y proporcionar respuestas de error consistentes.
 * También integra registro de errores y, opcionalmente, envío a servicios de monitoreo como Sentry.
 */
@Injectable()
export class ErrorInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        // Obtener información del contexto
        const request = context.switchToHttp().getRequest();
        const { method, url, body, ip } = request;
        const requestInfo = { method, url, ip };

        // Si ya es una HttpException, usarla directamente
        if (error instanceof HttpException) {
          // Registrar el error con detalles
          const statusCode = error.getStatus();
          const errorResponse = error.getResponse();

          this.logger.error(
            `[${statusCode}] ${JSON.stringify(errorResponse)} - ${method} ${url}`,
            error.stack,
          );

          // Solo reportar a monitoreo errores de servidor (500+)
          if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
            this.reportToMonitoring(error, { ...requestInfo, body });
          }

          return throwError(() => error);
        }

        // Para errores no HTTP, crear un error 500 genérico
        this.logger.error(
          `Error no manejado: ${error.message}`,
          error.stack,
          `${method} ${url}`,
        );

        // Reportar todos los errores no manejados
        this.reportToMonitoring(error, { ...requestInfo, body });

        // Producción: Devolver un mensaje genérico para errores de servidor
        // Desarrollo: Incluir el mensaje original para facilitar la depuración
        const isDev = process.env.NODE_ENV !== 'production';
        const message = isDev
          ? (error.message ?? 'Error interno del servidor')
          : 'Error interno del servidor';

        const errorObj = {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message,
          timestamp: new Date().toISOString(),
          path: url,
        };

        return throwError(
          () => new HttpException(errorObj, HttpStatus.INTERNAL_SERVER_ERROR),
        );
      }),
    );
  }

  /**
   * Reporta errores a un servicio de monitoreo como Sentry
   */
  private reportToMonitoring(error: Error, context: any): void {
    // Solo reportar si está configurado un servicio de monitoreo
    if (process.env.SENTRY_DSN) {
      try {
        Sentry.withScope((scope) => {
          // Añadir contexto adicional
          scope.setExtras(context);
          // Capturar la excepción
          Sentry.captureException(error);
        });
      } catch (sentryError) {
        // Si hay un error al reportar, simplemente lo registramos localmente
        this.logger.error(
          `Error al reportar a monitoreo: ${sentryError.message}`,
        );
      }
    }
  }
}
