import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        const response = context.switchToHttp().getResponse();
        const request = context.switchToHttp().getRequest();

        // Si la respuesta ya tiene el formato ApiResponse, la retornamos tal como está
        if (data && typeof data === 'object' && 'success' in data) {
          return data as ApiResponse<T>;
        }

        // Si es una respuesta con data y meta (paginación), la formateamos
        if (
          data &&
          typeof data === 'object' &&
          'data' in data &&
          'meta' in data
        ) {
          return {
            success: true,
            data: data.data,
            message: this.getSuccessMessage(request.method),
            meta: {
              ...data.meta,
              hasNext: data.meta.page < data.meta.totalPages,
              hasPrev: data.meta.page > 1,
            },
            timestamp: new Date().toISOString(),
          };
        }

        // Respuesta estándar para datos simples
        return {
          success: true,
          data,
          message: this.getSuccessMessage(request.method),
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }

  private getSuccessMessage(method: string): string {
    switch (method) {
      case 'POST':
        return 'Recurso creado exitosamente';
      case 'PUT':
      case 'PATCH':
        return 'Recurso actualizado exitosamente';
      case 'DELETE':
        return 'Recurso eliminado exitosamente';
      case 'GET':
      default:
        return 'Operación exitosa';
    }
  }
}
