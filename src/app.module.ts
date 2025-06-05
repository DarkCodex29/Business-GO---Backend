import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './users/usuarios.module';
import { PrismaModule } from './prisma/prisma.module';
import { EmailModule } from './email/email.module';
import { ProductosModule } from './productos/products.module';
import { ClientesModule } from './clientes/clientes.module';
import { EmpresasModule } from './empresas/empresas.module';
import { ArchivosModule } from './archivos/archivos.module';
import { VentasModule } from './ventas/ventas.module';
import { RolesModule } from './roles/roles.module';
import { ReportesModule } from './reportes/reportes.module';
import { ValoracionesModule } from './valoraciones/valoraciones.module';
import { InventarioModule } from './inventario/inventario.module';
import { ComprasModule } from './compras/compras.module';
import { FidelizacionModule } from './fidelizacion/fidelizacion.module';
import { SuscripcionesModule } from './suscripciones/suscripciones.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { EvolutionApiModule } from './integrations/evolution-api/evolution-api.module';
import { RateLimitMiddleware } from './common/middleware/rate-limit.middleware';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

@Module({
  imports: [
    // Módulos de Infraestructura (no visibles en Swagger)
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsuariosModule,
    EmailModule,
    ProductosModule,
    ClientesModule,
    EmpresasModule,
    ArchivosModule,
    VentasModule,
    RolesModule,
    ReportesModule,
    ValoracionesModule,
    InventarioModule,
    ComprasModule,
    FidelizacionModule,
    // Módulos SaaS
    SuscripcionesModule,
    WhatsappModule,
    // Integraciones
    EvolutionApiModule,
  ],
  providers: [
    // Interceptor global para estandarizar respuestas
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    // Filter global para manejo de excepciones
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RateLimitMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
