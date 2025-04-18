import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class BigIntSerializationInterceptor implements NestInterceptor {
  private transformValue(value: any): any {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.transformValue(item));
    }
    if (value && typeof value === 'object') {
      const transformed = {};
      for (const key in value) {
        transformed[key] = this.transformValue(value[key]);
      }
      return transformed;
    }
    return value;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        return this.transformValue(data);
      }),
    );
  }
}
